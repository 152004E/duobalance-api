import { Test, TestingModule } from '@nestjs/testing';
import { CouplesService } from './couples.service';

describe('CouplesService', () => {
  let service: CouplesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CouplesService],
    }).compile();

    service = module.get<CouplesService>(CouplesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
