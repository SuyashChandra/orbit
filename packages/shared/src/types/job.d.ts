import type { JobStatus } from '../constants.js';
export interface JobApplicationDTO {
    id: string;
    companyName: string;
    jobTitle: string;
    location: string | null;
    jobDescription: string | null;
    status: JobStatus;
    appliedAt: string;
    createdAt: string;
    resumes: ResumeDTO[];
}
export interface ResumeDTO {
    id: string;
    filename: string;
    uploadedAt: string;
}
export interface CreateJobBody {
    companyName: string;
    jobTitle: string;
    location?: string;
    jobDescription?: string;
    status?: JobStatus;
    appliedAt?: string;
}
export interface UpdateJobBody extends Partial<CreateJobBody> {
}
export interface LinkResumeBody {
    resumeId: string;
}
//# sourceMappingURL=job.d.ts.map