package com.kizuna.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    SUCCESS("SUCCESS", "Success", HttpStatus.OK),
    BAD_REQUEST("BAD_REQUEST", "Invalid request parameters", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED("UNAUTHORIZED", "Authentication required or invalid token", HttpStatus.UNAUTHORIZED),
    FORBIDDEN("FORBIDDEN", "You do not have permission to perform this action", HttpStatus.FORBIDDEN),
    NOT_FOUND("NOT_FOUND", "Requested resource not found", HttpStatus.NOT_FOUND),
    CONFLICT("CONFLICT", "Resource already exists or conflict occurred", HttpStatus.CONFLICT),
    VALIDATION_FAILED("VALIDATION_FAILED", "Request validation failed", HttpStatus.BAD_REQUEST),
    FIREBASE_ERROR("FIREBASE_ERROR", "Firebase service error occurred", HttpStatus.INTERNAL_SERVER_ERROR),
    INTERNAL_ERROR("INTERNAL_ERROR", "An unexpected server error occurred", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(String code, String message, HttpStatus httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
