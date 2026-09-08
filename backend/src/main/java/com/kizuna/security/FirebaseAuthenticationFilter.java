package com.kizuna.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    private final FirebaseAuth firebaseAuth;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {

        String bearerToken = extractBearerToken(request);

        if (StringUtils.hasText(bearerToken) && firebaseAuth != null) {
            try {
                FirebaseToken decodedToken = firebaseAuth.verifyIdToken(bearerToken);
                String uid = decodedToken.getUid();
                String email = decodedToken.getEmail();
                String name = decodedToken.getName();
                String picture = decodedToken.getPicture();

                FirebaseUserPrincipal principal = FirebaseUserPrincipal.builder()
                        .uid(uid)
                        .email(email)
                        .name(name)
                        .picture(picture)
                        .role("ROLE_USER")
                        .build();

                FirebaseAuthenticationToken authentication = new FirebaseAuthenticationToken(
                        principal,
                        bearerToken,
                        principal.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("Authenticated user {} via Firebase Token", uid);

            } catch (Exception e) {
                log.warn("Invalid Firebase ID token received from {}: {}", request.getRemoteAddr(), e.getMessage());
                // Do not block here; Spring Security will block unauthorized requests to protected endpoints
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractBearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
