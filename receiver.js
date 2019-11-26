const castContext = cast.framework.CastReceiverContext.getInstance();
const castDebugLogger = cast.debug.CastDebugLogger.getInstance();
const playerManager = castContext.getPlayerManager();

const TAG = 'receiver';
const LIVE_MEDIA_URL = 'https://streaming.cast.pe/devsummit/ds.smil/playlist.m3u8';
const LIVE_MEDIA_METADATA_SERVICE_URI =
        'https://us-central1-cast-tses.cloudfunctions.net/io-2019-live';


/**
 * Start playing the live stream as soon as the receiver is finished loading.
 */
castContext.addEventListener(
    cast.framework.system.EventType.READY, (event) => {
      const mediaInfo = new cast.framework.messages.MediaInformation();
      const loadRequest =
      new cast.framework.messages.LoadRequestData(mediaInfo);

      castDebugLogger.info(TAG, 'Receiver started, initiating load request.');
      playerManager.load(loadRequest);
    });

/**
 * Load interceptor
 */
playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.LOAD,
    (request) => {
      castDebugLogger.info(TAG, 'Intercepting LOAD request');
      request.autoplay = true;
      request.media.streamType = cast.framework.messages.StreamType.LIVE;
      request.media.contentUrl = LIVE_MEDIA_URL;

      loadGuideData();

      playerManager.removeSupportedMediaCommands(
          cast.framework.messages.Command.SEEK, true);

      return request;
    }
);

/**
 * Seek a seek interceptor is called whenever CAF receives a request to seek to
 * a different location in media. This interceptor can be used to modify that
 * seek request or disable seeking completely.
 * @param {cast.framework.messages.MessageType.SEEK} The message to intercept.
 */
playerManager.setMessageInterceptor(
    cast.framework.messages.MessageType.SEEK,
    (seekData) => {
      // if the SEEK supported media command is disabled, block seeking
      if (!(playerManager.getSupportedMediaCommands() &
      cast.framework.messages.Command.SEEK)) {
        castDebugLogger.info(TAG, 'Seek blocked.');
        return null;
      }

      return seekData;
    }
);

/**
 * Gets the current program guide data from our Google Cloud Function
 * @return {cast.framework.messages.MediaMetadata[]} Latest program guide data
 */
function loadGuideData() {
  return fetch(LIVE_MEDIA_METADATA_SERVICE_URI)
      .then((response) => response.json())
      .then(function(data) {
        const containerMetadata =
          new cast.framework.messages.ContainerMetadata();
        containerMetadata.sections = data;

        playerManager.getQueueManager().setContainerMetadata(containerMetadata);
      });
}
