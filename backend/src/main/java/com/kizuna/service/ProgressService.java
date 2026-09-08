package com.kizuna.service;

import com.kizuna.dto.request.ProgressSubmitRequest;
import com.kizuna.dto.response.ProgressSummaryResponse;
import com.kizuna.model.UserProgress;

import java.util.List;

public interface ProgressService {

    UserProgress recordProgress(String userId, ProgressSubmitRequest request);

    ProgressSummaryResponse getProgressSummary(String userId);

    List<UserProgress> getDueReviews(String userId);
}
