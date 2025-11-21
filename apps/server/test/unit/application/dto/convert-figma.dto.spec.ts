import { validate } from 'class-validator';
import { ConvertFigmaDto } from '../../../../src/modules/figma/application/dto/convert-figma.dto';

// unit tests for the ConvertFigmaDto validation
describe('ConvertFigmaDto', () => {
    // tests that a valid DTO with both fields passes validation
    it('should pass validation with valid fileKey and token', async () => {
        const dto = new ConvertFigmaDto();
        dto.fileKey = 'MxMXpjiLPbdHlratvH0Wdy';
        dto.token = 'figd_abc123xyz';

        const errors = await validate(dto);

        expect(errors.length).toBe(0);
    });

    // tests that missing fileKey fails validation
    it('should fail validation when fileKey is missing', async () => {
        const dto = new ConvertFigmaDto();
        dto.token = 'figd_abc123xyz';

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('fileKey');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    // tests that missing token fails validation
    it('should fail validation when token is missing', async () => {
        const dto = new ConvertFigmaDto();
        dto.fileKey = 'MxMXpjiLPbdHlratvH0Wdy';

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('token');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    // tests that empty string fileKey fails validation
    it('should fail validation when fileKey is empty string', async () => {
        const dto = new ConvertFigmaDto();
        dto.fileKey = '';
        dto.token = 'figd_abc123xyz';

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('fileKey');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    // tests that empty string token fails validation
    it('should fail validation when token is empty string', async () => {
        const dto = new ConvertFigmaDto();
        dto.fileKey = 'MxMXpjiLPbdHlratvH0Wdy';
        dto.token = '';

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('token');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    // tests that non-string fileKey fails validation
    it('should fail validation when fileKey is not a string', async () => {
        const dto = new ConvertFigmaDto();
        (dto as any).fileKey = 123;
        dto.token = 'figd_abc123xyz';

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('fileKey');
        expect(errors[0].constraints).toHaveProperty('isString');
    });

    // tests that non-string token fails validation
    it('should fail validation when token is not a string', async () => {
        const dto = new ConvertFigmaDto();
        dto.fileKey = 'MxMXpjiLPbdHlratvH0Wdy';
        (dto as any).token = { key: 'value' };

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('token');
        expect(errors[0].constraints).toHaveProperty('isString');
    });

    // tests that whitespace-only strings fail validation
    it('should fail validation when fileKey is only whitespace', async () => {
        const dto = new ConvertFigmaDto();
        dto.fileKey = '   ';
        dto.token = 'figd_abc123xyz';

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('fileKey');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    // tests that whitespace-only token fails validation
    it('should fail validation when token is only whitespace', async () => {
        const dto = new ConvertFigmaDto();
        dto.fileKey = 'MxMXpjiLPbdHlratvH0Wdy';
        dto.token = '   ';

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('token');
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    // tests that both fields missing fails validation with multiple errors
    it('should fail validation when both fields are missing', async () => {
        const dto = new ConvertFigmaDto();

        const errors = await validate(dto);

        expect(errors.length).toBe(2);
        const properties = errors.map(e => e.property);
        expect(properties).toContain('fileKey');
        expect(properties).toContain('token');
    });

    // tests that null values fail validation
    it('should fail validation when fileKey is null', async () => {
        const dto = new ConvertFigmaDto();
        (dto as any).fileKey = null;
        dto.token = 'figd_abc123xyz';

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('fileKey');
    });

    // tests that undefined values fail validation
    it('should fail validation when token is undefined', async () => {
        const dto = new ConvertFigmaDto();
        dto.fileKey = 'MxMXpjiLPbdHlratvH0Wdy';
        dto.token = undefined as any;

        const errors = await validate(dto);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('token');
    });
});

