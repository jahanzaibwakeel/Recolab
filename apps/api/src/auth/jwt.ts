import jwt from "jsonwebtoken";
import { config } from "../config.js";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
  name: string;
}

export function signAuthToken(payload: AuthTokenPayload) {
  const options: jwt.SignOptions = {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    issuer: "recolab-local"
  };
  return jwt.sign(payload, config.jwtSecret, {
    ...options
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: "recolab-local"
  }) as AuthTokenPayload & jwt.JwtPayload;
}
