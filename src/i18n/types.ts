export interface TranslationKeys {
  // App shell
  'app.title': string;
  'app.loading': string;

  // Header / Status
  'status.vpn_ok': string;
  'status.vpn_down': string;
  'status.vpn_starting': string;
  'status.no_vpn': string;
  'status.error': string;
  'status.docker_ok': string;
  'status.docker_down': string;
  'status.docker_count': string;
  'status.jellyfin_ok': string;
  'status.jellyfin_off': string;
  'status.iron_gate': string;

  // Footer
  'footer.configura': string;
  'footer.fonti': string;
  'footer.cerca': string;
  'footer.free': string;
  'footer.basic': string;
  'footer.dev': string;

  // Action panel
  'actions.avvia_tutto': string;
  'actions.ferma_tutto': string;
  'actions.sospendi': string;
  'actions.riprendi': string;
  'actions.forza': string;
  'actions.restart': string;
  'actions.stack_docker_torrent': string;
  'actions.tutti_torrent': string;
  'actions.on_suffix': string;

  // Gate unlock
  'gate.open_countdown': string;
  'gate.arm_now': string;
  'gate.down': string;
  'gate.unlock_15min': string;
  'gate.torrent_in_chiaro': string;
  'gate.confirm_unlock': string;
  'gate.cancel': string;
  'gate.armed': string;

  // Rate limit
  'rate.title': string;
  'rate.bandwidth_detected': string;
  'rate.unlimited': string;
  'rate.remove_limit': string;
  'rate.limit_value': string;

  // Torrent panel
  'torrent.realtime': string;
  'torrent.offline': string;
  'torrent.download': string;
  'torrent.paused': string;
  'torrent.seed': string;
  'torrent.no_peer': string;
  'torrent.metadata': string;
  'torrent.checking': string;
  'torrent.stopped': string;
  'torrent.forced': string;
  'torrent.allocating': string;
  'torrent.error': string;
  'torrent.moving': string;
  'torrent.col': string;
  'torrent.tot': string;
  'torrent.zoom_out': string;
  'torrent.zoom_in': string;
  'torrent.no_downloads': string;
  'torrent.importing_metadata': string;
  'torrent.pause_tooltip': string;
  'torrent.resume_tooltip': string;
  'torrent.force_tooltip': string;
  'torrent.recheck_tooltip': string;
  'torrent.remove_tooltip': string;

  // Sources modal
  'sources.title': string;
  'sources.desc': string;
  'sources.empty': string;
  'sources.name_placeholder': string;
  'sources.url_placeholder': string;
  'sources.username_placeholder': string;
  'sources.password_placeholder': string;
  'sources.cancel': string;
  'sources.saving': string;
  'sources.add': string;
  'sources.add_source': string;

  // Search modal
  'search.title': string;
  'search.desc': string;
  'search.placeholder': string;
  'search.btn': string;
  'search.all': string;
  'search.movies': string;
  'search.tv': string;
  'search.audio': string;
  'search.software': string;
  'search.min_seeders': string;
  'search.seed': string;
  'search.size': string;
  'search.date': string;
  'search.results': string;
  'search.searching': string;
  'search.no_results': string;
  'search.add_client': string;
  'search.no_magnet': string;

  // License modal
  'license.title': string;
  'license.basic_feat_1': string;
  'license.basic_feat_2': string;
  'license.basic_feat_3': string;
  'license.basic_feat_4': string;
  'license.basic_feat_5': string;
  'license.basic_feat_6': string;
  'license.dev_feat_1': string;
  'license.dev_feat_2': string;
  'license.dev_feat_3': string;
  'license.dev_feat_4': string;
  'license.dev_feat_5': string;
  'license.dev_feat_6': string;
  'license.activate': string;
  'license.buy': string;
  'license.best_value': string;

  // Theme toggle
  'theme.light': string;
  'theme.dark': string;

  // Wizard
  'wizard.welcome_title': string;
  'wizard.welcome_subtitle': string;
  'wizard.your_account': string;
  'wizard.account_desc': string;
  'wizard.email_placeholder': string;
  'wizard.name_optional': string;
  'wizard.admin_badge': string;
  'wizard.license_title': string;
  'wizard.license_desc': string;
  'wizard.license_free': string;
  'wizard.vpn_title': string;
  'wizard.vpn_desc': string;
  'wizard.vpn_active': string;
  'wizard.vpn_none': string;
  'wizard.vpn_provider': string;
  'wizard.vpn_your_connectors': string;
  'wizard.vpn_no_connectors': string;
  'wizard.sources_title': string;
  'wizard.sources_desc': string;
  'wizard.done_title': string;
  'wizard.done_open': string;
  'wizard.back': string;
  'wizard.next': string;
  'wizard.skip': string;

  // Demons panel
  'demons.title': string;
  'demons.iron_gate': string;
  'demons.state_poller': string;
  'demons.watchdog': string;
  'demons.github': string;
  'demons.telemetry': string;
  'demons.metadata': string;
  'demons.pipeline': string;
  'demons.thread_sentinel': string;
  'demons.scheduled_task': string;

  // Docker panel
  'docker.title': string;
  'docker.running': string;
  'docker.exited': string;
  'docker.missing': string;

  // Startup
  'startup.sentryflow': string;

  // Links
  'links.jellyfin': string;
  'links.qbittorrent': string;
  'links.prowlarr': string;
  'links.sonarr': string;
  'links.radarr': string;
  'links.bazarr': string;
}
