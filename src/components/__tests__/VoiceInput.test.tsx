import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import VoiceInput from '../VoiceInput';

const mockTranscribeFile = vi.fn();
const mockGetUserMedia = vi.fn();

beforeEach(() => {
  // Mock the service provider
  (window as any).useServices = () => ({
    voiceTranscriptionService: { transcribeFile: mockTranscribeFile },
  });
  // Mock getUserMedia
  (navigator.mediaDevices as any) = {
    getUserMedia: mockGetUserMedia,
  };
  mockTranscribeFile.mockReset();
  mockGetUserMedia.mockReset();
});

describe('VoiceInput', () => {
  it('shows error if microphone access denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Mic denied'));
    const { getByTitle, findByText } = render(
      <VoiceInput onTranscribed={() => {}} />
    );
    fireEvent.click(getByTitle('Click to start recording voice input'));
    expect(await findByText('Mic denied')).toBeTruthy();
  });

  it('shows error if transcription fails', async () => {
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [{ stop: () => {} }] });
    mockTranscribeFile.mockResolvedValue({ success: false, error: new Error('No speech detected') });
    const { getByTitle, findByText } = render(
      <VoiceInput onTranscribed={() => {}} />
    );
    fireEvent.click(getByTitle('Click to start recording voice input'));
    // Simulate stop
    await waitFor(() => {
      // Simulate MediaRecorder events
      const instance = (window as any).MediaRecorder?.mock.instances[0];
      if (instance) instance.onstop();
    });
    expect(await findByText('No speech detected')).toBeTruthy();
  });

  it('calls onTranscribed on success', async () => {
    mockGetUserMedia.mockResolvedValue({ getTracks: () => [{ stop: () => {} }] });
    mockTranscribeFile.mockResolvedValue({ success: true, text: 'Hello world' });
    const onTranscribed = vi.fn();
    const { getByTitle } = render(
      <VoiceInput onTranscribed={onTranscribed} />
    );
    fireEvent.click(getByTitle('Click to start recording voice input'));
    await waitFor(() => {
      const instance = (window as any).MediaRecorder?.mock.instances[0];
      if (instance) instance.onstop();
    });
    expect(onTranscribed).toHaveBeenCalledWith('Hello world');
  });
});
