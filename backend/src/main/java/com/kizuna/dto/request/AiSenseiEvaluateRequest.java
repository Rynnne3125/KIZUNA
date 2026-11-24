package com.kizuna.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

public class AiSenseiEvaluateRequest {

    private String milestoneId;
    private String milestoneTitle;
    private String dialogueTitle;
    private String partnerSpeechJp;
    private String learnerPrompt;
    private String sampleAnswer;

    @NotBlank(message = "studentInput không được để trống")
    @Size(max = 1000, message = "studentInput quá dài")
    private String studentInput;

    private List<String> requiredKeywords = new ArrayList<>();
    private List<String> whitelistVocabulary = new ArrayList<>();
    private List<String> whitelistGrammar = new ArrayList<>();

    public AiSenseiEvaluateRequest() {}

    public String getMilestoneId() { return milestoneId; }
    public void setMilestoneId(String milestoneId) { this.milestoneId = milestoneId; }

    public String getMilestoneTitle() { return milestoneTitle; }
    public void setMilestoneTitle(String milestoneTitle) { this.milestoneTitle = milestoneTitle; }

    public String getDialogueTitle() { return dialogueTitle; }
    public void setDialogueTitle(String dialogueTitle) { this.dialogueTitle = dialogueTitle; }

    public String getPartnerSpeechJp() { return partnerSpeechJp; }
    public void setPartnerSpeechJp(String partnerSpeechJp) { this.partnerSpeechJp = partnerSpeechJp; }

    public String getLearnerPrompt() { return learnerPrompt; }
    public void setLearnerPrompt(String learnerPrompt) { this.learnerPrompt = learnerPrompt; }

    public String getSampleAnswer() { return sampleAnswer; }
    public void setSampleAnswer(String sampleAnswer) { this.sampleAnswer = sampleAnswer; }

    public String getStudentInput() { return studentInput; }
    public void setStudentInput(String studentInput) { this.studentInput = studentInput; }

    public List<String> getRequiredKeywords() { return requiredKeywords; }
    public void setRequiredKeywords(List<String> requiredKeywords) { this.requiredKeywords = requiredKeywords; }

    public List<String> getWhitelistVocabulary() { return whitelistVocabulary; }
    public void setWhitelistVocabulary(List<String> whitelistVocabulary) { this.whitelistVocabulary = whitelistVocabulary; }

    public List<String> getWhitelistGrammar() { return whitelistGrammar; }
    public void setWhitelistGrammar(List<String> whitelistGrammar) { this.whitelistGrammar = whitelistGrammar; }
}
