import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
export class ReviewEvidenceDto {
 @IsIn(['Accepted','Rejected','Needs more information']) reviewStatus: string;
 @IsString() @MinLength(1) @MaxLength(2000) reviewNote: string;
}
