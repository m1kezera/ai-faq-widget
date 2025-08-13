import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AskService } from './ask.service';

@Controller('ask')
export class AskController {
  constructor(private readonly askService: AskService) {}

  @Post()
  async askQuestion(
    @Body('question') question: string,
    @Headers('x-site-key') siteKey: string,
  ) {
    return this.askService.answerQuestion(siteKey, question);
  }
}
