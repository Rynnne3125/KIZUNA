package com.kizuna.repository;

import com.google.cloud.firestore.Firestore;
import com.kizuna.model.AiAuditEntry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Repository
public class AiAuditRepository {

    private static final Logger logger = LoggerFactory.getLogger(AiAuditRepository.class);
    private static final String COLLECTION_NAME = "ai_evaluation_audits";

    private final Firestore firestore;
    private final Map<String, AiAuditEntry> auditStorage = new ConcurrentHashMap<>();

    public AiAuditRepository(@Autowired(required = false) Firestore firestore) {
        this.firestore = firestore;
        seedSampleAudits();
    }

    private void seedSampleAudits() {
        AiAuditEntry a1 = new AiAuditEntry(
                "audit_001",
                "2",
                "user",
                "milestone_01_hiragana",
                "Viết 1 câu chào buổi sáng tự nhiên.",
                "おはようございます！先生。",
                "Câu đúng nhưng vị trí dấu chấm trước xưng hô chưa tự nhiên theo ngữ cảnh.",
                7,
                "Từ này người Nhật trong trường học vẫn dùng rất thường xuyên ạ!"
        );
        save(a1);
    }

    public List<AiAuditEntry> findAll() {
        return auditStorage.values().stream()
                .sorted(Comparator.comparing(AiAuditEntry::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public List<AiAuditEntry> findPending() {
        return auditStorage.values().stream()
                .filter(a -> "PENDING".equalsIgnoreCase(a.getStatus()))
                .sorted(Comparator.comparing(AiAuditEntry::getCreatedAt).reversed())
                .collect(Collectors.toList());
    }

    public Optional<AiAuditEntry> findById(String id) {
        return Optional.ofNullable(auditStorage.get(id));
    }

    public AiAuditEntry save(AiAuditEntry entry) {
        if (entry.getId() == null || entry.getId().isBlank()) {
            entry.setId("audit_" + System.currentTimeMillis());
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
}
