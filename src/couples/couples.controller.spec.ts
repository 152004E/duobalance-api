import { Test, TestingModule } from '@nestjs/testing';
import { CouplesController } from './couples.controller';

describe('CouplesController', () => {
  let controller: CouplesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouplesController],
    }).compile();

    controller = module.get<CouplesController>(CouplesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
