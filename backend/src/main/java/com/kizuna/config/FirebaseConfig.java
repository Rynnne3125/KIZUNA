package com.kizuna.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${kizuna.firebase.project-id:ebook-fdc02}")
    private String projectId;

    @Value("${kizuna.firebase.service-account-path:firebase-service-account.json}")
    private String serviceAccountPath;

    @Value("${kizuna.firebase.database-url:https://ebook-fdc02-default-rtdb.firebaseio.com}")
    private String databaseUrl;

    @Bean
    public Firestore firestore() {
        try {
            ClassPathResource resource = new ClassPathResource(serviceAccountPath);
            if (resource.exists()) {
                try (InputStream serviceAccount = resource.getInputStream()) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .setProjectId(projectId)
                            .setDatabaseUrl(databaseUrl)
                            .build();

                    if (FirebaseApp.getApps().isEmpty()) {
                        FirebaseApp.initializeApp(options);
                        logger.info("FirebaseApp initialized successfully with Service Account from: {}", serviceAccountPath);
                    }
                    return FirestoreClient.getFirestore();
                }
            } else {
                logger.warn("Firebase Service Account key '{}' not found in resources. Initializing Firestore via Project ID: '{}'.",
                        serviceAccountPath, projectId);
                logger.info("NOTE: For live Firestore backend operations, place your Firebase Service Account JSON (from Firebase Console -> Project Settings -> Service accounts) into 'backend/src/main/resources/{}'",
                        serviceAccountPath);

                // Fallback: Initialize Firestore with Project ID (supports ADC / Google Cloud environment)
                FirestoreOptions firestoreOptions = FirestoreOptions.newBuilder()
                        .setProjectId(projectId)
                        .build();
                return firestoreOptions.getService();
            }
        } catch (Exception e) {
            logger.warn("Unable to fully initialize Firebase/Firestore: {}. Falling back to standard configuration.", e.getMessage());
            FirestoreOptions firestoreOptions = FirestoreOptions.newBuilder()
                    .setProjectId(projectId)
                    .build();
            return firestoreOptions.getService();
        }
    }
}
