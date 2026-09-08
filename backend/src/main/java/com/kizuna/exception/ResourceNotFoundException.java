package com.kizuna.exception;

import com.kizuna.common.ErrorCode;

public class ResourceNotFoundException extends AppException {

    public ResourceNotFoundException(String resourceName, String id) {
        super(ErrorCode.NOT_FOUND, String.format("%s not found with identifier: %s", resourceName, id));
    }

    public ResourceNotFoundException(String message) {
        super(ErrorCode.NOT_FOUND, message);
    }
}
