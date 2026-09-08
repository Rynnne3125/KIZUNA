package com.kizuna.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${kizuna.firebase.config-path:classpath:firebase-service-account.json}")
    private String configPath;

    @Value("${kizuna.firebase.credentials-base64:}")
    private String credentialsBase64;

    @Value("${kizuna.firebase.project-id:kizuna-nihongo-app}")
    private String projectId;

    @Value("${kizuna.firebase.emulator.enabled:false}")
    private boolean emulatorEnabled;

    @Value("${kizuna.firebase.emulator.host:localhost:8088}")
    private String emulatorHost;

    private final ResourceLoader resourceLoader;

    public FirebaseConfig(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @Bean
    public FirebaseApp firebaseApp() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        try {
            GoogleCredentials credentials = resolveCredentials();

            FirebaseOptions.Builder optionsBuilder = FirebaseOptions.builder()
                    .setProjectId(projectId);

            if (credentials != null) {
                optionsBuilder.setCredentials(credentials);
            }

            FirebaseApp app = FirebaseApp.initializeApp(optionsBuilder.build());
            log.info("FirebaseApp successfully initialized for project: {}", projectId);
            return app;
        } catch (Exception e) {
            log.warn("Could not initialize FirebaseApp with provided credentials ({}). " +
                     "Falling back to default initialization. Ensure proper Firebase config for production.", e.getMessage());
            try {
                FirebaseOptions fallbackOptions = FirebaseOptions.builder()
                        .setProjectId(projectId)
                        .setCredentials(GoogleCredentials.newBuilder().build())
                        .build();
                return FirebaseApp.initializeApp(fallbackOptions);
            } catch (Exception ex) {
                log.error("Failed to initialize fallback FirebaseApp: {}", ex.getMessage());
                return null;
            }
        }
    }

    @Bean
    public Firestore firestore(FirebaseApp firebaseApp) {
        if (emulatorEnabled) {
            log.info("Connecting to Firestore Emulator at {}", emulatorHost);
            return FirestoreOptions.newBuilder()
                    .setProjectId(projectId)
                    .setHost(emulatorHost)
                    .setCredentials(GoogleCredentials.newBuilder().build())
                    .build()
                    .getService();
        }

        if (firebaseApp != null) {
            try {
                return FirestoreClient.getFirestore(firebaseApp);
            } catch (Exception e) {
                log.warn("Error getting Firestore from FirebaseApp: {}. Creating fallback Firestore client.", e.getMessage());
            }
        }

        return FirestoreOptions.newBuilder()
                .setProjectId(projectId)
                .build()
                .getService();
    }

    @Bean
    public FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        if (firebaseApp != null) {
            return FirebaseAuth.getInstance(firebaseApp);
        }
        return null;
    }

    private GoogleCredentials resolveCredentials() throws Exception {
        // 1. Check Base64 encoded credentials (Environment variable / Secret manager)
        if (credentialsBase64 != null && !credentialsBase64.trim().isEmpty()) {
            log.info("Loading Firebase credentials from Base64 environment variable");
            byte[] decodedBytes = Base64.getDecoder().decode(credentialsBase64.trim());
            return GoogleCredentials.fromStream(new ByteArrayInputStream(decodedBytes));
        }

        // 2. Check file path (classpath or filesystem)
        if (configPath != null && !configPath.trim().isEmpty()) {
            Resource resource = resourceLoader.getResource(configPath.trim());
            if (resource.exists()) {
                log.info("Loading Firebase credentials from file: {}", configPath);
                try (InputStream is = resource.getInputStream()) {
                    return GoogleCredentials.fromStream(is);
                }
            } else {
                log.warn("Firebase credentials file does not exist at '{}'. Checking Google Application Default Credentials.", configPath);
            }
        }

        // 3. Fallback to Google Application Default Credentials (GCP environment)
        try {
            return GoogleCredentials.getApplicationDefault();
        } catch (Exception e) {
            log.info("Google Application Default Credentials not found. Using unauthenticated credentials for dev/local.");
            return GoogleCredentials.newBuilder().build();
        }
    }
}
