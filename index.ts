// Analysis form data types
export interface InitialQuestionnaireData {
  analysisFor: 'myself' | 'other';
  otherReason?: string;
  hadSurgery: boolean;
  surgeryDetails?: string;
  hadTrauma: boolean;
  traumaDetails?: string;
  usedDevice: boolean;
  deviceDetails?: string;
}

export type PhotoType = 'frontBodyPhoto' | 'backBodyPhoto' | 'seriousFacePhoto' | 'smilingFacePhoto';

export interface PhotoUploadData {
  frontBodyPhoto?: string;
  backBodyPhoto?: string;
  seriousFacePhoto?: string;
  smilingFacePhoto?: string;
}

export interface PriorityQuestionnaireData {
  priorityArea: 'health' | 'relationships' | 'professional';
  complaint1: string;
  complaint2?: string;
  complaint3?: string;
}

export type AnalysisFormData = InitialQuestionnaireData & PhotoUploadData & PriorityQuestionnaireData;

// Step management
export type FormStep = 1 | 2 | 3 | 4 | 5;

// API response types
export interface AnalysisRequestResponse {
  requestId: string;
  message: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
}
