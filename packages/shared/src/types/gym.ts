export interface ExerciseDTO {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  isCustom: boolean;
  createdByUserId: string | null;
}

export interface WorkoutDTO {
  id: string;
  name: string;
  exercises: WorkoutExerciseDTO[];
  createdAt: string;
}

export interface WorkoutExerciseDTO {
  id: string;
  exercise: ExerciseDTO;
  orderIndex: number;
}

export interface WorkoutLogDTO {
  id: string;
  date: string;
  workout: Pick<WorkoutDTO, 'id' | 'name'> | null;
  sets: WorkoutLogSetDTO[];
}

export interface WorkoutLogSetDTO {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number | null;
}

export interface CreateWorkoutBody {
  name: string;
}

export interface AddWorkoutExerciseBody {
  exerciseId: string;
  orderIndex: number;
}

export interface LogSetBody {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight?: number;
}

export interface CreateCustomExerciseBody {
  name: string;
  category: string;
  muscleGroups: string[];
}
