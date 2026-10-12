import { afterEach, describe, expect, it, vi } from 'vitest';
import { consoleLogger } from './logger';

describe('consoleLogger', () => {
  afterEach(() => vi.restoreAllMocks());

  const spyOn = () => ({
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  });

  it('passes warnings and errors by default, with their details', () => {
    const console = spyOn();
    const logger = consoleLogger();
    logger.debug('[scene] edit');
    logger.info('[render] backend');
    logger.warn('[models] failed', { productId: 'a' });
    logger.error('[render] broken');
    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('[models] failed', { productId: 'a' });
    expect(console.error).toHaveBeenCalledWith('[render] broken');
  });

  it('passes everything from debug up', () => {
    const console = spyOn();
    const logger = consoleLogger('debug');
    logger.debug('[scene] edit');
    logger.info('[render] backend');
    expect(console.debug).toHaveBeenCalledWith('[scene] edit');
    expect(console.info).toHaveBeenCalledWith('[render] backend');
  });
});
