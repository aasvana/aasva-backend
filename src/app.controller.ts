import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from './common/decorators/public.decorator';
import { AppConfigService } from './config/app-config.service';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly appConfigService: AppConfigService,
  ) {}

  @Public()
  @Get()
  @Header('Content-Type', 'text/html')
  getRoot(@Res() res: Response) {
    const baseUrl = this.appConfigService.appBaseUrl;
    res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Restricted Gateway</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#111;color:#fff;text-align:center">
<div>
<h1>Restricted Gateway</h1>
<p>You will be redirected to the main page.</p>
</div>
<script>setTimeout(function(){window.location.href="${baseUrl}"},2000)</script>
</body>
</html>`);
  }

  @Public()
  @Get('health')
  getHealth(): Record<string, string> {
    return this.appService.getHealth();
  }
}
