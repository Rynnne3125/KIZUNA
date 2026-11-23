package com.kizuna.repository;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.kizuna.model.AiAuditEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Repository
public class AiAuditRepository {

    private static final Logger logger = LoggerFactory.getLogger(AiAuditRepository.class);
    private static final String COLLECTION_NAME = "ai_evaluation_audits";

    private final Firestore firestore;
    private final Map<String, AiAuditEntry> auditStorage = new ConcurrentHashMap<>();

    public AiAuditRepository(@Autowired(required = false) Firestore firestore) {
        this.firestore = firestore;
    }

    public List<AiAuditEntry> findAll() {
        syncFromFirestoreIfPossible();
        return auditStorage.values().stream()
                .sorted(Comparator.comparing(
                        a -> a.getCreatedAt() != null ? a.getCreatedAt() : 0L,
                        Comparator.reverseOrder()))
                .collect(Collectors.toList());
    }

    public List<AiAuditEntry> findPending() {
        return findAll().stream()
                .filter(a -> "PENDING".equalsIgnoreCase(a.getStatus()))
                .collect(Collectors.toList());
    }

    public Optional<AiAuditEntry> findById(String id) {
        if (auditStorage.containsKey(id)) {
            return Optional.of(auditStorage.get(id));
        }
        if (firestore != null) {
            try {
                DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(id).get().get(2, TimeUnit.SECONDS);
                if (doc.exists()) {
                    AiAuditEntry entry = doc.toObject(AiAuditEntry.class);
                    if (entry != null) {
                        if (entry.getId() == null) entry.setId(doc.getId());
                        auditStorage.put(entry.getId(), entry);
                        return Optional.of(entry);
                    }
                }
            } catch (Exception e) {
                logger.debug("Firestore findById for ai_evaluation_audits skipped: {}", e.getMessage());
            }
        }
        return Optional.empty();
    }

    public AiAuditEntry save(AiAuditEntry entry) {
        if (entry.getId() == null || entry.getId().isBlank()) {
            entry.setId("audit_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 5));
        }
        if (entry.getCreatedAt() == null) {
            entry.setCreatedAt(System.currentTimeMillis());
        }
        if (entry.getSubmittedAt() == null || entry.getSubmittedAt().isBlank()) {
            entry.setSubmittedAt(Instant.ofEpochMilli(entry.getCreatedAt()).toString());
        }
        auditStorage.put(entry.getId(), entry);

        if (firestore != null) {
            try {
                firestore.collection(COLLECTION_NAME).document(entry.getId()).set(entry);
            } catch (Exception e) {
                logger.debug("Firestore persist for ai_evaluation_audits skipped: {}", e.getMessage());
            }
        }
        return entry;
    }

    private void syncFromFirestoreIfPossible() {
        if (firestore == null) return;
        try {
            var docs = firestore.collection(COLLECTION_NAME).limit(100).get().get(2, TimeUnit.SECONDS).getDocuments();
            for (DocumentSnapshot doc : docs) {
                AiAuditEntry remote = doc.toObject(AiAuditEntry.class);
                if (remote != null) {
                    if (remote.getId() == null || remote.getId().isBlank()) {
                        remote.setId(doc.getId());
                    }
                    auditStorage.putIfAbsent(remote.getId(), remote);
                }
            }
        } catch (Exception e) {
            logger.debug("Firestore sync for ai_evaluation_audits skipped: {}", e.getMessage());
        }
    }
}
