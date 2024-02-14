# axios-token-controller

Having trouble managing refresh token and access token? This simple package makes your token management very efficient. This package injects latest access token to every http calls. We use mutex to handle the calling of refresh token function. There's no problem how many refresh token calls get initiated, mutex will only allow the first call and passes the tokens to other calls. This way you won't have any conflict with refreshing token anymore. Thus you will overcome any unexpected behavior refreshing token such as suddenly logout.

## Features

- Injects latest access token to every http calls
- Automatically refreshes token when the access token is expired.
- Refreshes token when any http request return 401 status code.
- It calls refresh token function only one time when you get multiple 401 response and calls them again with the new access token
- Provides various events and functions to meet your needs
- It doesn't use any storage api such as localStorage or cookies. It uses variable to store your tokens safely.
- It has 0 dependencies
- Fully configurable

## Installing

### Package manager

Using npm:

`$ npm install axios-token-controller`

Using yarn:

`$ yarn add axios-token-controller`

## Step 1

First create an instance of axios and pass it to tokenController with your other desired configuration as shown below.

```ts
import axios from 'axios';
import tokenController, {getTokens} from "axios-token-controller";

// Define your refresh token function which returns at least refresh token and access token as shown below
// Note: you can return any other data. You will get all these returned data by listening tokenUpdated event
const refreshToken = async () => {
  const rToken = getTokens().refreshToken;
  // you should use getTokens function to get the refresh token or access token. And use your desired token to make the refresh token http request.

  const response = await fetch(....)
  ....
  
  return {
    accessToken: ACCESS_TOKEN, // the access token you are getting in the response data
    refreshToken: REFRESH_TOKEN, // the refresh token you are getting in the response data
  };
};
 ...
// Define an Axios instance with your desired configuration. I am not configuring anything with the instance to make it simple
 ...

const instance = axios.create();

// pass the instance above to the tokenController alongside other configurations
...

export const authAxios = tokenController({
  axiosInstance: instance, // required
  refreshToken: refreshToken, // required | pass your above refreshToken function you just defined
  isBearerToken: true, // optional | boolean | default: true
  requestTokenHeader: "Authorization" // optional | string | default: Authorization
});

// if you are using typescript, you can use type shown below
// import { AxiosInstance } from "axios";
export const authAxios: AxiosInstance = tokenController({
  axiosInstance: instance, // required
  refreshToken: refreshToken, // required | pass your above refreshToken function you just defined
  isBearerToken: true, // optional | boolean | default: true
  requestTokenHeader: "Authorization" // optional | string | default: Authorization
});

//Note: finally you can use this exported instance to your authenticated http requests. but before that follow step 2
```
## Step 2

**Note:** Before you use the exported instance make sure you set the initial access token and refresh token as shown below.

```ts
import { setTokens } from "axios-token-controller";
//After login, you can store your tokens in any kind of storage like localStorage/cookies. it's up to you. Always set the tokens whenever page gets refresh. You have to do it because we don't persist tokens, only use variable for token in process.
setTokens(ACCESS_TOKEN, REFRESH_TOKEN);
```
## Step 3

Now you can use the authAxios the instance of axios to make your authenticated calls. And left the complicated part to the package.

```ts
authAxios.get("https://domain.com/secure-data")
```

## Events

### tokenUpdated

This event is fired whenever the package calls refreshToken function. This event has the returned data of refreshToken function you passed in the configuration. You can use these data to update your stored existing tokens.

```ts
window.addEventListener("tokenUpdated", (data) => {
    ...
    // update your stored tokens or something else
});
```

### tokenUpdateFailed

This event is fired whenever refreshToken function returns undefined or any error. You can use this event to redirect page to login page or logout from your app.

```ts
window.addEventListener("tokenUpdateFailed", () => {
    ...
    // add your logout logic or something else
});
```

## Methods

### getTokens

This function returns object which contains accessToken and refreshToken.

```ts
import { getTokens } from "axios-token-controller";

const tokens = getTokens()
// returns {
//     accessToken,
//     refreshToken
// }
```
### setTokens

This function sets the accessToken and refreshToken, which will be used by the package.

```ts
import { setTokens } from "axios-token-controller";

const tokens = getTokens(ACCESS_TOKEN, REFRESH_TOKEN)
```
### deleteTokens

This function sets the accessToken and refreshToken to undefined.

```ts
import { deleteTokens } from "axios-token-controller";

deleteTokens()
```