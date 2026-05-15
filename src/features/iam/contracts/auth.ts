export type UserLoginIn = {
  username: string;
  password: string;
};

export type TokenOut = {
  access_token: string;
  token_type: string;
  expires_in: number | null;
};

export type CurrentUser = {
  id: number;
  username: string;
  permissions: string[];
};
