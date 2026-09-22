package com.kizuna.dto.response;

public class QuestSubmitResult {
    private String milestoneId;
    private int questIndex;
    private String result = "PASSED";
    private int scoredXp;
    private int scoredActivePoints;
    private boolean milestoneCompleted;
    private String nextMilestoneId;
    private boolean nextMilestoneUnlocked;
    private int updatedTotalXp;
    private int updatedActivePoints;
    private int updatedStreak;
    private String feedbackMessage;

    public QuestSubmitResult() {}

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public int getQuestIndex() { return questIndex; }
    public void setQuestIndex(int questIndex) { this.questIndex = questIndex; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }

    public int getScoredXp() { return scoredXp; }
    public void setScoredXp(int scoredXp) { this.scoredXp = scoredXp; }

    public int getScoredActivePoints() { return scoredActivePoints; }
    public void setScoredActivePoints(int scoredActivePoints) { this.scoredActivePoints = scoredActivePoints; }

    public boolean isMilestoneCompleted() { return milestoneCompleted; }
    public void setMilestoneCompleted(boolean milestoneCompleted) { this.milestoneCompleted = milestoneCompleted; }

    public String getNextMilestoneId() { return nextMilestoneId; }
    public void setNextMilestoneId(String nextMilestoneId) { this.nextMilestoneId = nextMilestoneId; }

    public boolean isNextMilestoneUnlocked() { return nextMilestoneUnlocked; }
    public void setNextMilestoneUnlocked(boolean nextMilestoneUnlocked) { this.nextMilestoneUnlocked = nextMilestoneUnlocked; }

    public int getUpdatedTotalXp() { return updatedTotalXp; }
    public void setUpdatedTotalXp(int updatedTotalXp) { this.updatedTotalXp = updatedTotalXp; }

    public int getUpdatedActivePoints() { return updatedActivePoints; }
    public void setUpdatedActivePoints(int updatedActivePoints) { this.updatedActivePoints = updatedActivePoints; }

    public int getUpdatedStreak() { return updatedStreak; }
    public void setUpdatedStreak(int updatedStreak) { this.updatedStreak = updatedStreak; }

    public String getFeedbackMessage() { return feedbackMessage; }
    public void setFeedbackMessage(String feedbackMessage) { this.feedbackMessage = feedbackMessage; }
}
