package com.kizuna.security;

import com.kizuna.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<FirebaseUserPrincipal> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof FirebaseUserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    public static FirebaseUserPrincipal getCurrentUserRequired() {
        return getCurrentUser().orElseThrow(() -> new UnauthorizedException("User authentication required"));
    }

    public static String getCurrentUserId() {
        return getCurrentUserRequired().getUid();
    }
}
