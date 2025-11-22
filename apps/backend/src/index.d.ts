import { Request, Response } from "express";
import { JwtPayload } from "@expense-tracker/shared-types";

declare global {
	namespace Express {
		interface Request {
			user?: JwtPayload;
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
		// Override the default User type
		interface User extends JwtPayload {}
	}
}
