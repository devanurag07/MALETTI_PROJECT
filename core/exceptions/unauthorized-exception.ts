import { BaseException } from "./base-exception";

export class UnauthorizedException extends BaseException {
    constructor(message: string = "Unauthorized Access") {
        super(message, 401);
    }
}