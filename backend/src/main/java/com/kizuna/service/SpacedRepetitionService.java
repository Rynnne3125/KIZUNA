package com.kizuna.service;

import com.kizuna.dto.request.SrsReviewRequest;
import com.kizuna.model.UserSrsItem;

import java.util.List;

public interface SpacedRepetitionService {
    List<UserSrsItem> getDueItemsToday(String userId);
    UserSrsItem reviewItem(String userId, String itemId, SrsReviewRequest request);
    List<UserSrsItem> getAllUserItems(String userId);
}
