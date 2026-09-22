package com.kizuna.model;

public class UserSrsItem {
    private String id; // Format: {userId}_{itemId}
    private String userId;
    private String itemType; // VOCABULARY, KANJI, GRAMMAR
    private String itemId;
    private int repetitionLevel = 0;
    private int intervalDays = 1;
    private double easeFactor = 2.5;
    private Long nextReviewDate;
    private int failedCount = 0;
    private boolean isFailedQueue = false;
    private int lastReviewQuality = 0;

    public UserSrsItem() {}

    public UserSrsItem(String userId, String itemType, String itemId) {
        this.id = userId + "_" + itemId;
        this.userId = userId;
        this.itemType = itemType;
        this.itemId = itemId;
        this.nextReviewDate = System.currentTimeMillis() + 86400000L; // Next day
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public String getItemId() { return itemId; }
    public void setItemId(String itemId) { this.itemId = itemId; }

    public int getRepetitionLevel() { return repetitionLevel; }
    public void setRepetitionLevel(int repetitionLevel) { this.repetitionLevel = repetitionLevel; }

    public int getIntervalDays() { return intervalDays; }
    public void setIntervalDays(int intervalDays) { this.intervalDays = intervalDays; }

    public double getEaseFactor() { return easeFactor; }
    public void setEaseFactor(double easeFactor) { this.easeFactor = easeFactor; }

    public Long getNextReviewDate() { return nextReviewDate; }
    public void setNextReviewDate(Long nextReviewDate) { this.nextReviewDate = nextReviewDate; }

    public int getFailedCount() { return failedCount; }
    public void setFailedCount(int failedCount) { this.failedCount = failedCount; }

    public boolean isFailedQueue() { return isFailedQueue; }
    public void setFailedQueue(boolean failedQueue) { isFailedQueue = failedQueue; }

    public int getLastReviewQuality() { return lastReviewQuality; }
    public void setLastReviewQuality(int lastReviewQuality) { this.lastReviewQuality = lastReviewQuality; }
}
