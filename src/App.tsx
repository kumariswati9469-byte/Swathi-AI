import { useState } from 'react';
import { AssistantBubble } from './components/AssistantBubble.tsx';
import { StudioPanel, type StudioTab } from './components/StudioPanel.tsx';
import { VoiceStage } from './components/VoiceStage.tsx';
import { useSwatiLive } from './hooks/useSwatiLive.ts';

function getBrightnessClass(brightness: number): string {
  if (brightness <= 35) return 'brightness-[0.35]';
  if (brightness <= 45) return 'brightness-[0.45]';
  if (brightness <= 55) return 'brightness-[0.55]';
  if (brightness <= 65) return 'brightness-[0.65]';
  if (brightness <= 75) return 'brightness-[0.75]';
  if (brightness <= 85) return 'brightness-[0.85]';
  if (brightness <= 95) return 'brightness-[0.95]';
  return 'brightness-100';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<StudioTab>('transcript');
  const live = useSwatiLive((tab) => setActiveTab(tab));

  const isConnected = live.connectionState === 'connected';
  const isConnecting = live.connectionState === 'connecting';

  const handleNavJump = (tab?: StudioTab) => {
    if (tab) {
      setActiveTab(tab);
    } else {
      document.getElementById('stage')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#0B0B0D] text-[#F5F3EE] transition-[filter] duration-200 ${getBrightnessClass(
        live.deviceStatus.brightness
      )}`}
    >
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="w-full border-b border-white/[0.08] bg-[#0B0B0D]">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#stage"
            onClick={(e) => {
              e.preventDefault();
              handleNavJump();
            }}
            className="font-serif italic text-2xl font-semibold tracking-tight text-[#F5F3EE] whitespace-nowrap shrink-0"
          >
            Swati
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A19E95]"
          >
            <button
              type="button"
              onClick={() => handleNavJump('transcript')}
              className={`hover:text-[#F5F3EE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'transcript' ? 'text-[#F5F3EE]' : ''
              }`}
            >
              Transcript
            </button>
            <button
              type="button"
              onClick={() => handleNavJump('planner')}
              className={`hover:text-[#F5F3EE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'planner' ? 'text-[#F5F3EE]' : ''
              }`}
            >
              Planner
            </button>
            <button
              type="button"
              onClick={() => handleNavJump('care')}
              className={`hover:text-[#F5F3EE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'care' ? 'text-[#F5F3EE]' : ''
              }`}
            >
              Care
            </button>
            <button
              type="button"
              onClick={() => handleNavJump('system')}
              className={`hover:text-[#F5F3EE] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'system' ? 'text-[#F5F3EE]' : ''
              }`}
            >
              System
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            <button
              type="button"
              disabled={isConnecting}
              onClick={isConnected ? live.disconnect : () => live.connect()}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E14B32] ${
                isConnected
                  ? 'bg-white/[0.08] hover:bg-white/[0.14] text-[#F5F3EE] border border-white/[0.12]'
                  : 'bg-[#E14B32] hover:bg-[#EC5E47] text-[#F5F3EE]'
              }`}
            >
              {isConnecting
                ? 'Connecting…'
                : isConnected
                  ? 'End Session'
                  : 'Start Session'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[calc(100vh-10.5rem)]">
          <div className="lg:col-span-7 flex flex-col">
            <VoiceStage
              connectionState={live.connectionState}
              isMuted={live.isMuted}
              isMicAvailable={live.isMicAvailable}
              isSwatiSpeaking={live.isSwatiSpeaking}
              wakeWordSupported={live.wakeWordSupported}
              wakeWordEnabled={live.settings.wakeWordEnabled}
              wakeWordListening={live.wakeWordListening}
              flashlightOn={live.deviceStatus.flashlightOn}
              userPetName={live.settings.userPetName}
              errorMessage={live.errorMessage}
              micNotice={live.micNotice}
              sessionSeconds={live.sessionSeconds}
              timers={live.timers}
              alarms={live.alarms}
              pendingConfirmations={live.pendingConfirmations}
              typingPreview={live.typingPreview}
              lastNavCard={live.lastNavCard}
              inputAnalyserRef={live.inputAnalyserRef}
              outputAnalyserRef={live.outputAnalyserRef}
              onConnect={() => live.connect()}
              onDisconnect={live.disconnect}
              onToggleMute={live.toggleMute}
              onToggleWakeWord={() =>
                live.updateSettings({
                  wakeWordEnabled: !live.settings.wakeWordEnabled,
                })
              }
              onInterrupt={live.interruptSwati}
              onDismissRinging={live.dismissRinging}
              onApproveConfirmation={live.approveConfirmation}
              onCancelConfirmation={live.cancelConfirmation}
              onDismissTypingPreview={live.dismissTypingPreview}
              onReopenLink={live.reopenLink}
              onSendText={live.sendTextMessage}
            />
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <StudioPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              connectionState={live.connectionState}
              wakeWordSupported={live.wakeWordSupported}
              internetError={live.internetError}
              transcript={live.transcript}
              openedLinks={live.openedLinks}
              memories={live.memories}
              timers={live.timers}
              alarms={live.alarms}
              screenshots={live.screenshots}
              deviceStatus={live.deviceStatus}
              healthState={live.healthState}
              weatherReport={live.weatherReport}
              weatherLoading={live.weatherLoading}
              newsHeadlines={live.newsHeadlines}
              newsLoading={live.newsLoading}
              groundedAnswers={live.groundedAnswers}
              searchLoading={live.searchLoading}
              messageDrafts={live.messageDrafts}
              pendingConfirmations={live.pendingConfirmations}
              todos={live.todos}
              timetable={live.timetable}
              notifications={live.notifications}
              emergencyContact={live.emergencyContact}
              permissions={live.permissions}
              customApps={live.customApps}
              savedLocations={live.savedLocations}
              lastNavCard={live.lastNavCard}
              lastWebsiteWork={live.lastWebsiteWork}
              websiteLoading={live.websiteLoading}
              activeControlFocus={live.activeControlFocus}
              settings={live.settings}
              pendingSettingsApply={live.pendingSettingsApply}
              sessionSeconds={live.sessionSeconds}
              inputLevel={live.inputLevel}
              outputLevel={live.outputLevel}
              onUpdateSettings={live.updateSettings}
              onApplyAndReconnect={live.applyAndReconnect}
              onClearTranscript={live.clearTranscript}
              onReopenLink={live.reopenLink}
              onSendText={live.sendTextMessage}
              onSetVolume={live.setVolume}
              onSetBrightness={live.setBrightness}
              onToggleFlashlight={() => live.toggleFlashlight()}
              onCaptureScreenshot={() => live.captureScreenshot()}
              onAddTimer={(secs, label) => live.addTimer(secs, label)}
              onRemoveTimer={live.removeTimer}
              onAddAlarm={(time, label) => live.addAlarm(time, label)}
              onToggleAlarm={live.toggleAlarm}
              onRemoveAlarm={live.removeAlarm}
              onAddMemory={(fact) => live.addMemory(fact)}
              onRemoveMemory={live.removeMemory}
              onClearMemories={live.clearMemories}
              onLaunchApp={live.launchAppByName}
              onAddCustomApp={live.addCustomApp}
              onRemoveCustomApp={live.removeCustomApp}
              onAddSavedLocation={live.addSavedLocation}
              onRemoveSavedLocation={live.removeSavedLocation}
              onNavigateLocation={live.navigateToDestination}
              onInspectWebsite={live.inspectWebsiteUrl}
              onUpdateHealth={live.updateHealth}
              onIncrementWater={live.incrementWater}
              onFetchWeather={live.fetchWeather}
              onFetchNews={live.fetchNews}
              onAskWeb={live.askWebQuestion}
              onSearchGoogle={live.searchGoogleUrl}
              onSearchYouTube={live.searchYouTubeUrl}
              onApproveConfirmation={live.approveConfirmation}
              onCancelConfirmation={live.cancelConfirmation}
              onAddTodo={live.addTodo}
              onToggleTodo={live.toggleTodo}
              onRemoveTodo={live.removeTodo}
              onAddTimetableSlot={live.addTimetableSlot}
              onToggleTimetableSlot={live.toggleTimetableSlot}
              onRemoveTimetableSlot={live.removeTimetableSlot}
              onRunRoutine={live.runRoutine}
              onAddNotification={live.addNotification}
              onMarkNotificationsRead={live.markNotificationsRead}
              onRemoveNotification={live.removeNotification}
              onUpdateEmergencyContact={live.updateEmergencyContact}
              onRequestPermission={live.requestPermission}
              onWipeAllLocalData={live.wipeAllLocalData}
            />
          </div>
        </div>
      </main>

      {/* Floating Assistant Bubble */}
      <AssistantBubble
        visible={live.settings.floatingBubbleEnabled}
        connectionState={live.connectionState}
        isSwatiSpeaking={live.isSwatiSpeaking}
        isMuted={live.isMuted}
        wakeWordListening={live.wakeWordListening}
        onConnect={() => live.connect()}
        onDisconnect={live.disconnect}
        onToggleMute={live.toggleMute}
        onHide={() => live.updateSettings({ floatingBubbleEnabled: false })}
      />

      {/* Quiet Editorial Footer */}
      <footer className="w-full border-t border-white/[0.06]">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#78756E]">
          <span>Swati Voice Companion</span>
          <span>
            Girlfriend Care · Personal Assistant · JARVIS Controls · Privacy Protected
          </span>
        </div>
      </footer>
    </div>
  );
}
