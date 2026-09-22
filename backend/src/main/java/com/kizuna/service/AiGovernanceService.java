package com.kizuna.service;

import com.kizuna.dto.request.AiAuditResolveRequest;
import com.kizuna.dto.request.AiSandboxRequest;
import com.kizuna.model.AiAuditEntry;

import java.util.List;
import java.util.Map;

public interface AiGovernanceService {
    Map<String, Object> runSandbox(AiSandboxRequest request);
    List<AiAuditEntry> getAuditQueue();
    AiAuditEntry resolveAudit(String auditId, String adminUsername, AiAuditResolveRequest request);
    Map<String, Object> getMetrics();
    List<Map<String, Object>> getDropOffFunnel();
    List<Map<String, Object>> getHardestItems();
}
