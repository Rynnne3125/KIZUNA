package com.kizuna.service.impl;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.kizuna.dto.request.LoginRequest;
import com.kizuna.dto.response.LoginResponse;
import com.kizuna.dto.response.UserResponse;
import com.kizuna.model.User;
import com.kizuna.repository.UserFirestoreRepository;
import com.kizuna.repository.UserRepository;
import com.kizuna.security.JwtTokenProvider;
import com.kizuna.security.UserPrincipal;
import com.kizuna.service.UserService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Set;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);
    private static final String FRONTEND_PASSWORD_SALT = "kizuna_salt_sec_2026";
    private static final Set<String> ADMIN_EMAILS = Set.of(
            "banhbeothuy10@gmail.com",
            "phongtt.23it@vku.udn.vn",
            "admin@kizuna.com"
    );

    private final UserRepository userRepository;
    private final UserFirestoreRepository userFirestoreRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public UserServiceImpl(UserRepository userRepository,
                           UserFirestoreRepository userFirestoreRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.userFirestoreRepository = userFirestoreRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    @PostConstruct
    @Override
    public void initDefaultUsers() {
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User(
                    "1",
                    "admin",
                    passwordEncoder.encode("admin123"),
                    "Kizuna System Admin",
                    "admin@kizuna.com",
                    "ROLE_ADMIN",
                    true
            );
            userRepository.save(admin);
            logger.info("Initialized default ADMIN account: username='admin'");
        }

        if (!userRepository.existsByUsername("banhbeothuy10")) {
            User admin = new User(
                    "usr_admin_banhbeothuy10",
                    "banhbeothuy10",
                    passwordEncoder.encode("admin123"),
                    "Thúy Trần (Admin)",
                    "banhbeothuy10@gmail.com",
                    "ROLE_ADMIN",
                    true
            );
            userRepository.save(admin);
        }

        if (!userRepository.existsByUsername("phongtt")) {
            User admin = new User(
                    "usr_admin_phongtt",
                    "phongtt",
                    passwordEncoder.encode("admin123"),
                    "Trần Thanh Phong (Admin)",
                    "phongtt.23it@vku.udn.vn",
                    "ROLE_ADMIN",
                    true
            );
            userRepository.save(admin);
        }

        if (!userRepository.existsByUsername("banhbeothuy10")) {
            User admin = new User(
                    "usr_admin_banhbeothuy10",
                    "banhbeothuy10",
                    passwordEncoder.encode("admin123"),
                    "Thúy Trần (Admin)",
                    "banhbeothuy10@gmail.com",
                    "ROLE_ADMIN",
                    true
            );
            userRepository.save(admin);
        }

        if (!userRepository.existsByUsername("user")) {
            User user = new User(
                    "2",
                    "user",
                    passwordEncoder.encode("user123"),
                    "Kizuna Standard User",
                    "user@kizuna.com",
                    "ROLE_USER",
                    true
            );
            userRepository.save(user);
        }
    }

    @Override
    public LoginResponse login(LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getUsername(),
                            loginRequest.getPassword()
                    )
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            String token = tokenProvider.generateToken(principal.getUsername(), principal.getRole());

            return new LoginResponse(
                    token,
                    principal.getUsername(),
                    principal.getRole(),
                    tokenProvider.getExpirationMs()
            );
        } catch (BadCredentialsException | UsernameNotFoundException e) {
            // Fallback: verify against Firestore users collection (supports SHA-256 salted frontend passwords)
            User fsUser = userFirestoreRepository != null
                    ? userFirestoreRepository.findByEmailOrUsername(loginRequest.getUsername())
                    : null;
            if (fsUser != null && !fsUser.isDeleted() && fsUser.isEnabled()
                    && verifyFirestorePassword(loginRequest.getPassword(), fsUser.getPassword())) {
                String normalizedRole = normalizeRole(fsUser.getRole(), fsUser.getEmail());
                fsUser.setRole(normalizedRole);
                if (fsUser.getUsername() == null || fsUser.getUsername().isBlank()) {
                    String em = fsUser.getEmail() != null ? fsUser.getEmail() : loginRequest.getUsername();
                    fsUser.setUsername(em.contains("@") ? em.substring(0, em.indexOf('@')) : em);
                }
                // Cache encoded password in memory repository so JwtAuthenticationFilter can load UserDetails
                User cached = new User(
                        fsUser.getId(),
                        fsUser.getUsername(),
                        passwordEncoder.encode(loginRequest.getPassword()),
                        fsUser.getFullName(),
                        fsUser.getEmail(),
                        normalizedRole,
                        fsUser.isEnabled()
                );
                userRepository.save(cached);
                String token = tokenProvider.generateToken(cached.getUsername(), cached.getRole());
                return new LoginResponse(token, cached.getUsername(), cached.getRole(), tokenProvider.getExpirationMs());
            }
            throw new BadCredentialsException("Invalid username or password");
        }
    }

    @Override
    public LoginResponse exchangeFirebaseIdToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new BadCredentialsException("Firebase ID token is required");
        }

        String email = null;
        String uid = null;
        String fullName = null;

        if (!FirebaseApp.getApps().isEmpty()) {
            try {
                FirebaseToken decoded = FirebaseAuth.getInstance().verifyIdToken(idToken.trim());
                email = decoded.getEmail() != null ? decoded.getEmail().trim().toLowerCase() : null;
                uid = decoded.getUid();
                fullName = decoded.getName();
            } catch (Exception e) {
                logger.warn("Firebase Admin SDK verification failed, falling back to payload parsing: {}", e.getMessage());
            }
        }

        // Fallback: decode JWT payload when Firebase Admin SDK is not initialized or fails
        if (email == null) {
            try {
                String[] parts = idToken.trim().split("\\.");
                if (parts.length >= 2) {
                    byte[] decodedBytes = Base64.getUrlDecoder().decode(parts[1]);
                    String payloadJson = new String(decodedBytes, StandardCharsets.UTF_8);
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode node = mapper.readTree(payloadJson);
                    if (node.has("email")) {
                        email = node.get("email").asText().trim().toLowerCase();
                    }
                    if (node.has("sub")) {
                        uid = node.get("sub").asText();
                    } else if (node.has("user_id")) {
                        uid = node.get("user_id").asText();
                    }
                    if (node.has("name")) {
                        fullName = node.get("name").asText();
                    }
                }
            } catch (Exception ex) {
                logger.warn("Failed to parse JWT payload fallback: {}", ex.getMessage());
            }
        }

        if (email == null || email.isBlank()) {
            throw new BadCredentialsException("Firebase token does not contain a valid email");
        }

        User fsUser = userFirestoreRepository != null ? userFirestoreRepository.findByEmailOrUsername(email) : null;
        if (fsUser != null && (fsUser.isDeleted() || !fsUser.isEnabled())) {
            throw new BadCredentialsException("Account is disabled or deleted");
        }

        String role = normalizeRole(fsUser != null ? fsUser.getRole() : null, email);
        String username = (fsUser != null && fsUser.getUsername() != null && !fsUser.getUsername().isBlank())
                ? fsUser.getUsername()
                : email.substring(0, email.indexOf('@'));
        String finalUid = uid != null ? uid : ("g_" + Math.abs(email.hashCode()));
        String finalFullName = (fullName != null && !fullName.isBlank()) ? fullName : (fsUser != null && fsUser.getFullName() != null ? fsUser.getFullName() : username);
        final String finalEmail = email;

        User cached = userRepository.findByUsernameOrEmail(finalEmail).orElseGet(() -> new User(
                fsUser != null && fsUser.getId() != null ? fsUser.getId() : finalUid,
                username,
                passwordEncoder.encode("firebase_oauth_" + finalUid),
                finalFullName,
                finalEmail,
                role,
                true
        ));
        cached.setRole(role);
        cached.setFullName(finalFullName);
        cached.setEmail(finalEmail);
        userRepository.save(cached);

        String token = tokenProvider.generateToken(cached.getUsername(), cached.getRole());
        return new LoginResponse(token, cached.getUsername(), cached.getRole(), tokenProvider.getExpirationMs());
    }

    private boolean verifyFirestorePassword(String rawPassword, String storedPassword) {
        if (rawPassword == null || storedPassword == null || storedPassword.isBlank()) return false;
        if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        String saltedSha256 = sha256Hex(rawPassword + FRONTEND_PASSWORD_SALT);
        return storedPassword.equalsIgnoreCase(saltedSha256) || storedPassword.equals(rawPassword);
    }

    private static String sha256Hex(String value) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private static String normalizeRole(String rawRole, String email) {
        if (email != null && ADMIN_EMAILS.contains(email.trim().toLowerCase())) {
            return "ROLE_ADMIN";
        }
        if (rawRole != null && rawRole.toLowerCase().contains("admin")) {
            return "ROLE_ADMIN";
        }
        return "ROLE_USER";
    }

    @Override
    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsernameOrEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getRole()
        );
    }

    @Override
    public User findByUsername(String username) {
        return userRepository.findByUsernameOrEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
    }
}
