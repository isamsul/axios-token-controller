interface TokenType {
  accessToken: any;
  refreshToken: any;
}
let isRefreshing = false;
let refreshQueue: any[] = [];
let tokens: TokenType = {
  accessToken: undefined,
  refreshToken: undefined,
};

export function deleteTokens() {
  tokens = {
    accessToken: undefined,
    refreshToken: undefined,
  };
}

export function setTokens(accessToken: any, refreshToken: any) {
  tokens = {
    accessToken,
    refreshToken,
  };
}

export function getTokens() {
  return tokens;
}

class CustomEventWithData extends Event {
  data: any;

  constructor(eventName: string, eventData: any) {
    super(eventName);
    this.data = eventData;
  }
}

const tokenUpdatedEvent = new CustomEventWithData("tokenUpdated", {
  bubbles: true,
  cancelable: true,
  data: {},
});

const tokenUpdatedFailedEvent = new CustomEventWithData("tokenUpdateFailed", {
  bubbles: true,
  cancelable: true,
  data: {},
});

const createMutex = () => {
  let mutex = Promise.resolve();

  const releaseMutex = async (data?: any) => {
    if (refreshQueue.length > 0) {
      const nextTask = refreshQueue.shift();
      nextTask(data);
      releaseMutex(data);
    } else {
      isRefreshing = false;
    }
  };

  return async (asyncTask: any) => {
    if (isRefreshing) {
      return new Promise<any>((resolve) => {
        refreshQueue.push((data: any) => resolve(data));
      });
    }

    isRefreshing = true;
    return (mutex = mutex
      .then(asyncTask)
      .then((data: any) => {
        if (data?.accessToken) {
          setTokens(data.accessToken, data.refreshToken);
          tokenUpdatedEvent.data = data;
          window.dispatchEvent(tokenUpdatedEvent);
        } else {
          window.dispatchEvent(tokenUpdatedFailedEvent);
          deleteTokens();
          isRefreshing = false;
          return Promise.reject("failed to refresh token");
        }
        releaseMutex(data);
        return data; // Resolve the promise with the data
      })
      .catch((error) => {
        // Handle errors if needed
        deleteTokens();
        window.dispatchEvent(tokenUpdatedFailedEvent);
        isRefreshing = false;
        console.error("Error during refreshing token:", error);
        return Promise.reject(error);
      }));
  };
};
interface RefreshTokenReturn {
  accessToken: any;
  refreshToken: any;
}
interface Options {
  axiosInstance: any;
  refreshToken: () =>
    | undefined
    | RefreshTokenReturn
    | Promise<RefreshTokenReturn>;
  isBearerToken?: boolean;
  requestTokenHeader?: string;
}

const refreshTokenMutexInstance = createMutex();

function tokenController({
  axiosInstance,
  isBearerToken = true,
  requestTokenHeader = "Authorization",
  refreshToken,
}: Options) {
  const refreshTokenMutex = async () => {
    return await refreshTokenMutexInstance(refreshToken);
  };
  const apiAxios: any = axiosInstance;
  apiAxios.interceptors.request.use((request: any) => {
    const accessToken = tokens.accessToken;
    request.headers[requestTokenHeader] = `${isBearerToken ? "Bearer " : ""}${accessToken}`;
    return request;
  });

  apiAxios.interceptors.response.use(
    (response: any) => {
      return response;
    },
    async (error: any) => {
      if (
        error.config &&
        error.response &&
        error.response.status === 401 &&
        !error.config.sent
      ) {
        error.config.sent = true;
        const oldRefreshToken = tokens.refreshToken;
        if (!oldRefreshToken) {
          return Promise.reject(error);
        }
        const d = await refreshTokenMutex();

        const accessToken = tokens.accessToken;
        if (accessToken) {
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return apiAxios.request(error.config);
        } else {
          deleteTokens();
          window.dispatchEvent(tokenUpdatedFailedEvent);
          return Promise.reject();
        }
      } else {
        return Promise.reject(error);
      }
    }
  );

  return apiAxios;
}

export default tokenController;
