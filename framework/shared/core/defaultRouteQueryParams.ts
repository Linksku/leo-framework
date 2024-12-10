type DefaultRouteParams = {
  Login: 'email',
  Register:
    | 'email'
    | 'name'
    | 'backAfterRegister'
    | 'did3pLogin',
  ResetPassword: 'email',
  ResetPasswordVerify: 'token',
  UnsubEmail: 'token',
  VerifyEmail: 'token',
};

export default DefaultRouteParams;
