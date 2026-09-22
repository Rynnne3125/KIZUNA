package com.kizuna.service;

import com.kizuna.dto.request.QuestSubmitRequest;
import com.kizuna.dto.response.JourneyMapResponse;
import com.kizuna.dto.response.QuestSubmitResult;
import com.kizuna.model.MilestoneQuest;
import com.kizuna.model.UserProgress;

import java.util.List;

public interface UserProgressService {
    JourneyMapResponse getJourneyMap(String userId, String username);
    List<MilestoneQuest> getMilestoneQuestsForUser(String userId, String milestoneId);
    QuestSubmitResult submitQuest(String userId, String username, String milestoneId, int questIndex, QuestSubmitRequest request);
    List<UserProgress> getUserProgressList(String userId);
    UserProgress getUserMilestoneProgress(String userId, String milestoneId);
}
