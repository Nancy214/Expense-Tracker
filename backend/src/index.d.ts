import { Request, Response } from "express";
import { TokenPayload } from "./types/auth";

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
            file?: {
                fieldname: string;
                originalname: string;
                encoding: string;
                mimetype: string;
                size: number;
                destination?: string;
                filename?: string;
                path?: string;
                buffer?: Buffer;
            };
        }
        interface Response {
            // Add any custom response properties here if needed
        }
        // Override the default User type
        interface User extends TokenPayload {}
    }
}

export {};
