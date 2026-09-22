package com.kizuna.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.ArrayList;
import java.util.List;

public class QuestSubmitRequest {

    @NotNull(message = "questIndex is required")
    @Min(value = 1, message = "questIndex must be between 1 and 4")
    @Max(value = 4, message = "questIndex must be between 1 and 4")
    private Integer questIndex;

    private List<String> failedItemIds = new ArrayList<>();
    private Double vocabMasteryRate;
    private String notes;

    public QuestSubmitRequest() {}

    public QuestSubmitRequest(Integer questIndex, List<String> failedItemIds, Double vocabMasteryRate) {
        this.questIndex = questIndex;
        this.failedItemIds = failedItemIds != null ? failedItemIds : new ArrayList<>();
        this.vocabMasteryRate = vocabMasteryRate;
    }

    public Integer getQuestIndex() { return questIndex; }
    public void setQuestIndex(Integer questIndex) { this.questIndex = questIndex; }

    public List<String> getFailedItemIds() { return failedItemIds; }
    public void setFailedItemIds(List<String> failedItemIds) { this.failedItemIds = failedItemIds; }

    public Double getVocabMasteryRate() { return vocabMasteryRate; }
    public void setVocabMasteryRate(Double vocabMasteryRate) { this.vocabMasteryRate = vocabMasteryRate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
