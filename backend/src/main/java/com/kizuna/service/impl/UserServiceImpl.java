package com.kizuna.service.impl;

import com.kizuna.dto.request.LoginRequest;
import com.kizuna.dto.response.LoginResponse;
import com.kizuna.dto.response.UserResponse;
import com.kizuna.model.User;
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

@Service
public class UserServiceImpl implements UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public UserServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
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
                    "Kizuna Administrator",
                    "admin@kizuna.com",
                    "ROLE_ADMIN",
                    true
            );
            userRepository.save(admin);
            logger.info("Initialized default ADMIN account: username='admin', password='admin123'");
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
            logger.info("Initialized default USER account: username='user', password='user123'");
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
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid username or password");
        }
    }

    @Override
    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
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
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with username: " + username));
    }
}
