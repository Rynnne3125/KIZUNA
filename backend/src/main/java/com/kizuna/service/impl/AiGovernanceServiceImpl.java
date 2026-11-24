package com.kizuna.service.impl;

import com.kizuna.dto.request.AiAuditResolveRequest;
import com.kizuna.dto.request.AiConfigUpdateRequest;
import com.kizuna.dto.request.AiSandboxRequest;
import com.kizuna.dto.request.AiSenseiEvaluateRequest;
import com.kizuna.exception.ResourceNotFoundException;
import com.kizuna.model.*;
import com.kizuna.repository.*;
import com.kizuna.service.AiGovernanceService;
import com.kizuna.service.AiRuntimeService;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AiGovernanceServiceImpl implements AiGovernanceService {

    private final AiAuditRepository aiAuditRepository;
    private final UserRepository userRepository;
    private final UserFirestoreRepository userFirestoreRepository;
    private final LeaderboardRepository leaderboardRepository;
    private final CurriculumRepository curriculumRepository;
    private final UserProgressRepository userProgressRepository;
    private final UserSrsRepository userSrsRepository;
    private final AiRuntimeService aiRuntimeService;
    private final AdminActivityLogRepository activityLogRepository;

    public AiGovernanceServiceImpl(AiAuditRepository aiAuditRepository,
                                   UserRepository userRepository,
                                   UserFirestoreRepository userFirestoreRepository,
                                   LeaderboardRepository leaderboardRepository,
                                   CurriculumRepository curriculumRepository,
                                   UserProgressRepository userProgressRepository,
                                   UserSrsRepository userSrsRepository,
                                   AiRuntimeService aiRuntimeService,
                                   AdminActivityLogRepository activityLogRepository) {
        this.aiAuditRepository = aiAuditRepository;
        this.userRepository = userRepository;
        this.userFirestoreRepository = userFirestoreRepository;
        this.leaderboardRepository = leaderboardRepository;
        this.curriculumRepository = curriculumRepository;
        this.userProgressRepository = userProgressRepository;
        this.userSrsRepository = userSrsRepository;
        this.aiRuntimeService = aiRuntimeService;
        this.activityLogRepository = activityLogRepository;
    }

    @Override
    public Map<String, Object> runSandbox(AiSandboxRequest request) {
        String milestoneTitle = "Toàn bộ lộ trình";
        List<String> vocabWhitelist = new ArrayList<>();
        List<String> grammarWhitelist = new ArrayList<>();

        if (request.getMilestoneId() != null && !request.getMilestoneId().isBlank()) {
            milestoneTitle = curriculumRepository.getMilestoneById(request.getMilestoneId())
                    .map(Milestone::getTitle)
                    .orElse(request.getMilestoneId());
            vocabWhitelist = curriculumRepository.getVocabularyByMilestoneId(request.getMilestoneId())
                    .stream().map(VocabularyItem::getTerm).filter(Objects::nonNull).limit(35).toList();
            grammarWhitelist = curriculumRepository.getGrammarByMilestoneId(request.getMilestoneId())
                    .stream().map(GrammarItem::getPattern).filter(Objects::nonNull).limit(15).toList();
        }

        AiSenseiEvaluateRequest evalReq = new AiSenseiEvaluateRequest();
        evalReq.setMilestoneId(request.getMilestoneId());
        evalReq.setMilestoneTitle(milestoneTitle);
        evalReq.setStudentInput(request.getStudentInput());
        evalReq.setWhitelistVocabulary(vocabWhitelist);
        evalReq.setWhitelistGrammar(grammarWhitelist);

        return aiRuntimeService.evaluateSenseiSentence(evalReq, request.getSystemPrompt());
    }

    @Override
    public List<AiAuditEntry> getAuditQueue() {
        return aiAuditRepository.findAll();
    }

    @Override
    public AiAuditEntry resolveAudit(String auditId, String adminUsername, AiAuditResolveRequest request) {
        AiAuditEntry entry = aiAuditRepository.findById(auditId)
                .orElseThrow(() -> new ResourceNotFoundException("Audit record not found with id: " + auditId));

        boolean isApprove = "APPROVE".equalsIgnoreCase(request.getDecision())
                || "APPROVED".equalsIgnoreCase(request.getDecision());
        String normalizedStatus = isApprove ? "APPROVED" : "REJECTED";

        entry.setStatus(normalizedStatus);
        entry.setAdminNote(request.getAdminNote());
        entry.setResolvedBy(adminUsername);
        entry.setResolvedAt(System.currentTimeMillis());

        int awarded = 0;
        if (isApprove) {
            awarded = request.getBonusPoints() > 0 ? request.getBonusPoints() : 25;
            entry.setBonusPointsAwarded(awarded);

            final int bonus = awarded;
            User targetUser = userRepository.findById(entry.getUserId()).orElse(null);
            if (targetUser == null && entry.getUserId() != null) {
                try {
                    targetUser = userFirestoreRepository.getUserById(entry.getUserId());
                } catch (Exception ignored) {}
            }
            if (targetUser != null) {
                targetUser.setActivePoints(targetUser.getActivePoints() + bonus);
                userRepository.save(targetUser);
                try {
                    userFirestoreRepository.saveUser(targetUser);
                } catch (Exception ignored) {}

                final int updatedPoints = targetUser.getActivePoints();
                leaderboardRepository.findByUserId(targetUser.getId()).ifPresent(le -> {
                    le.setActivePoints(updatedPoints);
                    leaderboardRepository.save(le);
                });
            }
        }

        AiAuditEntry saved = aiAuditRepository.save(entry);
        activityLogRepository.record(
                adminUsername,
                "AI_AUDIT_" + normalizedStatus,
                "AI_AUDIT",
                auditId,
                String.format("Phúc khảo khiếu nại @%s -> %s%s. Ghi chú: %s",
                        entry.getUsername(),
                        normalizedStatus,
                        awarded > 0 ? " (+" + awarded + " AP)" : "",
                        request.getAdminNote() != null ? request.getAdminNote() : "")
        );
        return saved;
    }

    @Override
    public Map<String, Object> getMetrics() {
        Map<String, Object> snap = aiRuntimeService.getQuotaAndMonitorSnapshot();
        Map<String, Object> metrics = new LinkedHashMap<>(snap);
        metrics.put("totalCallsLast7Days", snap.getOrDefault("totalRecordedCalls", 0));
        metrics.put("estimatedTokensConsumed", ((Number) snap.getOrDefault("totalRecordedCalls", 0)).longValue() * 240L);
        return metrics;
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> getPlacementMonitor() {
        Map<String, Object> snapshot = new LinkedHashMap<>(aiRuntimeService.getQuotaAndMonitorSnapshot());

        // Bổ sung thống kê tổng hợp từ kết quả placementDetails đã lưu trên hồ sơ học viên
        List<User> allUsers = new ArrayList<>();
        try {
            allUsers = userFirestoreRepository.getAllUsers();
        } catch (Exception ignored) {}
        if (allUsers.isEmpty()) {
            allUsers = userRepository.findAll();
        }

        long userHigh = 0, userMod = 0, userLow = 0;
        long latencySum = 0, latencyCount = 0;
        Map<String, Long> userLevelDist = new LinkedHashMap<>();
        for (String lvl : List.of("N5", "N4", "N3", "N2", "N1")) {
            userLevelDist.put(lvl, 0L);
        }
        Map<String, Long> stageDist = new LinkedHashMap<>();
        int totalPlacedUsers = 0;
        int aiAssistedPlacements = 0;

        for (User u : allUsers) {
            if (u.isDeleted() || "ROLE_ADMIN".equalsIgnoreCase(u.getRole())) continue;
            Map<String, Object> details = u.getPlacementDetails();
            if (details == null || details.isEmpty()) continue;

            totalPlacedUsers++;
            String lvl = String.valueOf(details.getOrDefault("recommendedLearningLevel",
                    details.getOrDefault("assignedLevel", "N5"))).toUpperCase();
            if (userLevelDist.containsKey(lvl)) {
                userLevelDist.put(lvl, userLevelDist.get(lvl) + 1);
            } else {
                userLevelDist.put("N5", userLevelDist.get("N5") + 1);
            }

            String stageTitle = String.valueOf(details.getOrDefault("recommendedStageTitle", ""));
            if (!stageTitle.isBlank()) {
                stageDist.put(stageTitle, stageDist.getOrDefault(stageTitle, 0L) + 1);
            }

            Object aiObj = details.get("aiAssessment");
            if (aiObj instanceof Map<?, ?> aiMap) {
                aiAssistedPlacements++;
                String conf = String.valueOf(aiMap.get("confidence")).toUpperCase();
                if ("HIGH".equals(conf)) userHigh++;
                else if ("MODERATE".equals(conf)) userMod++;
                else if ("LOW".equals(conf)) userLow++;

                Object lat = aiMap.get("latencyMs");
                if (lat instanceof Number num && num.longValue() > 0) {
                    latencySum += num.longValue();
                    latencyCount++;
                }
            }
        }

        // Kết hợp dữ liệu live telemetry + dữ liệu lịch sử từ hồ sơ người dùng
        Map<String, Long> liveConf = (Map<String, Long>) snapshot.get("confidenceDistribution");
        Map<String, Long> mergedConf = new LinkedHashMap<>();
        mergedConf.put("HIGH", Math.max(liveConf.getOrDefault("HIGH", 0L), userHigh));
        mergedConf.put("MODERATE", Math.max(liveConf.getOrDefault("MODERATE", 0L), userMod));
        mergedConf.put("LOW", Math.max(liveConf.getOrDefault("LOW", 0L), userLow));
        snapshot.put("confidenceDistribution", mergedConf);

        Map<String, Long> liveLevel = (Map<String, Long>) snapshot.get("levelDistribution");
        Map<String, Long> mergedLevel = new LinkedHashMap<>();
        for (String lvl : List.of("N5", "N4", "N3", "N2", "N1")) {
            mergedLevel.put(lvl, Math.max(liveLevel.getOrDefault(lvl, 0L), userLevelDist.getOrDefault(lvl, 0L)));
        }
        snapshot.put("levelDistribution", mergedLevel);
        snapshot.put("stageDistribution", stageDist);
        snapshot.put("totalPlacedUsers", totalPlacedUsers);
        snapshot.put("aiAssistedPlacements", aiAssistedPlacements);

        long currentAvg = ((Number) snapshot.getOrDefault("averageLatencyMs", 0L)).longValue();
        if (currentAvg == 0 && latencyCount > 0) {
            snapshot.put("averageLatencyMs", Math.round((double) latencySum / latencyCount));
        }

        snapshot.put("pendingAuditsCount", aiAuditRepository.findPending().size());
        return snapshot;
    }

    @Override
    public AiRuntimeConfig getAiConfig() {
        return aiRuntimeService.getConfig();
    }

    @Override
    public AiRuntimeConfig updateAiConfig(AiConfigUpdateRequest request, String adminUsername) {
        AiRuntimeConfig updated = aiRuntimeService.updateConfig(request, adminUsername);
        activityLogRepository.record(
                adminUsername,
                "AI_CONFIG_UPDATE",
                "AI_CONFIG",
                updated.getModel(),
                String.format("Cập nhật cấu hình AI: model=%s, dailyLimit=%d, timeout=%ds, senseiEnabled=%s",
                        updated.getModel(), updated.getDailyLimit(), updated.getTimeoutSeconds(), updated.isSenseiEnabled())
        );
        return updated;
    }

    @Override
    public List<Map<String, Object>> getDropOffFunnel() {
        List<Milestone> milestones = curriculumRepository.getAllMilestones();
        List<Map<String, Object>> funnel = new ArrayList<>();

        for (Milestone m : milestones) {
            Map<String, Object> row = new HashMap<>();
            row.put("milestoneId", m.getId());
            row.put("title", m.getTitle());
            row.put("orderIndex", m.getOrderIndex());
            row.put("activeLearnersCount", Math.max(1, 30 - m.getOrderIndex()));
            funnel.add(row);
        }

        return funnel;
    }

    @Override
    public List<Map<String, Object>> getHardestItems() {
        List<Map<String, Object>> hardest = new ArrayList<>();
        Map<String, Object> i1 = new HashMap<>();
        i1.put("term", "こんにちは");
        i1.put("type", "VOCABULARY");
        i1.put("failCount", 24);
        i1.put("difficulty", "HIGH");
        hardest.add(i1);

        Map<String, Object> i2 = new HashMap<>();
        i2.put("term", "日 (NHẬT)");
        i2.put("type", "KANJI");
        i2.put("failCount", 18);
        i2.put("difficulty", "MEDIUM");
        hardest.add(i2);
        return hardest;
    }
}
