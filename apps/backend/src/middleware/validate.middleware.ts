import { Request, Response, NextFunction } from "express";
import { ZodTypeAny, ZodError } from "zod";

type ValidationLocation = "body" | "params" | "query";

// This only modifies req.query when it must change due to validation.
// `req.query` remains immutable after changing it here.
function updateQuery(req: Request, value: any) {
	Object.defineProperty(req, "query", {
		...Object.getOwnPropertyDescriptor(req, "query"),
		writable: false,
		value,
	});
}

export const validate = (schema: ZodTypeAny, location: ValidationLocation = "body") => {
	return (req: Request, res: Response, next: NextFunction): void => {
		let dataToValidate: any;

		switch (location) {
			case "body":
				dataToValidate = req.body;
				break;
			case "params":
				dataToValidate = req.params;
				break;
			case "query":
				dataToValidate = req.query;
				break;
			default:
				dataToValidate = req.body;
		}

		if (!schema || typeof (schema as any).safeParse !== "function") {
			res.status(500).json({
				error: "Validation schema is missing or invalid",
			});
			return;
		}

		const result = (schema as any).safeParse(dataToValidate);

		if (!result.success) {
			const error = result.error as ZodError;
			res.status(400).json({
				error: `Validation failed for ${location}`,
				details: error.issues,
			});
			return;
		}

		// Update the appropriate request property with validated data
		switch (location) {
			case "body":
				req.body = result.data;
				break;
			case "params":
				req.params = result.data as any;
				break;
			case "query":
				updateQuery(req, result.data as any);
				break;
		}

		next();
	};
};
