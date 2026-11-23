package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class JlptExam {
    private String id;
    private String label;
    private String title;
    private String level;
    private String type;
    private int durationMinutes = 105;
    private int totalQuestions = 50;
    private int questionCount = 50;
    private int actualQuestionCount = 50;
    private int year = 2024;
    private int month = 7;
    private String audioUrl = "";
    private int explanationCount = 0;
    private String updatedAt;

    public JlptExam() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLabel() { return label != null ? label : title; }
    public void setLabel(String label) {
        this.label = label;
        if (this.title == null) this.title = label;
    }

    public String getTitle() { return title != null ? title : label; }
    public void setTitle(String title) {
        this.title = title;
        if (this.label == null) this.label = title;
    }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) {
        this.totalQuestions = totalQuestions;
        this.questionCount = totalQuestions;
    }

    public int getQuestionCount() { return questionCount; }
    public void setQuestionCount(int questionCount) { this.questionCount = questionCount; }

    public int getActualQuestionCount() { return actualQuestionCount; }
    public void setActualQuestionCount(int actualQuestionCount) { this.actualQuestionCount = actualQuestionCount; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }

    public int getExplanationCount() { return explanationCount; }
    public void setExplanationCount(int explanationCount) { this.explanationCount = explanationCount; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
