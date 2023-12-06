import * as Sentry from '@sentry/browser';
import { IDecodedUserData } from '../types/types';

export default class ErrorHandler {
  private static instance: ErrorHandler;
  private SENTRY_DNS_KEY = "https://fe4fa82d476149429ed674627a222a8b@sentry.io/1476091";
  
  private constructor() {
    Sentry.init({ dsn: this.SENTRY_DNS_KEY });
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
}

  public configureScope = (userData: IDecodedUserData) =>
    Sentry.configureScope((scope) => {
      scope.setUser({
        Employer: userData.Employer,
        email: userData.email,
        firstname: userData.firstname,
        groups: userData.groups,
        lastname: userData.lastname,
        sub: userData.sub,
      });
    });
  
  public captureException = (error: any) => {
    if (error) {
      if (error?.message?.includes("NotReadableError")) {
        return console.error("captureException sentry", error.message);
      }
      return Sentry.captureException(error)
    }
    return;
  }
}
