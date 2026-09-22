package com.kizuna.model;

public class VocabularyItem {
    private String id;
    private String milestoneId;
    private String term;
    private String reading;
    private String sinoVietnamese;
    private String vietnameseMeaning;
    private String wordType;
    private String exampleSentenceJp;
    private String exampleSentenceVi;
    private String nejSource;
    private boolean isCore = true;

    public VocabularyItem() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public String getTerm() { return term; }
    public void setTerm(String term) { this.term = term; }

    public String getReading() { return reading; }
    public void setReading(String reading) { this.reading = reading; }

    public String getSinoVietnamese() { return sinoVietnamese; }
    public void setSinoVietnamese(String sinoVietnamese) { this.sinoVietnamese = sinoVietnamese; }

    public String getVietnameseMeaning() { return vietnameseMeaning; }
    public void setVietnameseMeaning(String vietnameseMeaning) { this.vietnameseMeaning = vietnameseMeaning; }

    public String getWordType() { return wordType; }
    public void setWordType(String wordType) { this.wordType = wordType; }

    public String getExampleSentenceJp() { return exampleSentenceJp; }
    public void setExampleSentenceJp(String exampleSentenceJp) { this.exampleSentenceJp = exampleSentenceJp; }

    public String getExampleSentenceVi() { return exampleSentenceVi; }
    public void setExampleSentenceVi(String exampleSentenceVi) { this.exampleSentenceVi = exampleSentenceVi; }

    public String getNejSource() { return nejSource; }
    public void setNejSource(String nejSource) { this.nejSource = nejSource; }

    public boolean isCore() { return isCore; }
    public void setCore(boolean core) { isCore = core; }
}
