package com.kizuna.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class GrammarItem {
    private String id;
    private String milestoneId;
    private String pattern;
    private String titleVi;
    private String explanation;
    private String nuanceReason;
    private String masterExampleJp;
    private String masterExampleVi;
    private String level = "N5";
    private String jlptLevel = "N5";
    private Map<String, Object> scrambledTest;

    public GrammarItem() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public String getPattern() { return pattern; }
    public void setPattern(String pattern) { this.pattern = pattern; }

    public String getTitleVi() { return titleVi; }
    public void setTitleVi(String titleVi) { this.titleVi = titleVi; }

    public String getExplanation() { return explanation; }
    public void setExplanation(String explanation) { this.explanation = explanation; }

    public String getNuanceReason() { return nuanceReason; }
    public void setNuanceReason(String nuanceReason) { this.nuanceReason = nuanceReason; }

    public String getMasterExampleJp() { return masterExampleJp; }
    public void setMasterExampleJp(String masterExampleJp) { this.masterExampleJp = masterExampleJp; }

    public String getMasterExampleVi() { return masterExampleVi; }
    public void setMasterExampleVi(String masterExampleVi) { this.masterExampleVi = masterExampleVi; }

    public String getLevel() { return level != null ? level : jlptLevel; }
    public void setLevel(String level) {
        this.level = level;
        if (level != null) this.jlptLevel = level;
    }

    public String getJlptLevel() { return jlptLevel != null ? jlptLevel : level; }
    public void setJlptLevel(String jlptLevel) {
        this.jlptLevel = jlptLevel;
        if (jlptLevel != null) this.level = jlptLevel;
    }

    public Map<String, Object> getScrambledTest() { return scrambledTest; }
    public void setScrambledTest(Map<String, Object> scrambledTest) { this.scrambledTest = scrambledTest; }
}
