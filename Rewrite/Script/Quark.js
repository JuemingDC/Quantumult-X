/*
夸克去广告
author: 可莉🅥
homepage: https://hub.kelee.one
Converted for Quantumult X
*/

let body = $response.body;

try {
  let obj = JSON.parse(body);

  if (obj.result && typeof obj.result === "object") {
    const blockPatterns = [
      /ad/i,
      /ads/i,
      /banner/i,
      /popup/i,
      /pop/i,
      /modal/i,
      /vip/i,
      /svip/i,
      /pay/i,
      /coupon/i,
      /lottery/i,
      /activity/i,
      /welfare/i,
      /reward/i,
      /member/i,
      /grade/i,
      /guide/i,
      /bubble/i,
      /operation/i,
      /marketing/i,
      /promotion/i,
      /maizeng/i,
      /retain/i,
      /recharge/i,
      /rights/i,
      /benefit/i,
      /toast/i,
      /float/i,
      /window/i,
      /novel.*slot/i,
      /noah.*ad/i,
      /reader.*ad/i,
      /video.*grade/i,
      /cloud.*vip/i,
      /camera.*vip/i,
      /qkscan.*member/i
    ];

    for (const key of Object.keys(obj.result)) {
      if (blockPatterns.some(re => re.test(key))) {
        delete obj.result[key];
      }
    }

    const exactKeys = [
      "cms_homepage_push_banner_config",
      "cms_as_home_capsule_entry",
      "cms_navi_category",
      "cms_shortcut",
      "cms_home_appstore_comment",
      "cms_home_festival_style_enable",
      "cms_sK_home_top_banner",
      "scan_king_home_tools_new",
      "cms_camera_skills",
      "cms_ai_home_options",
      "cms_search_direct_link",
      "cms_cloud_drive_activity_window",
      "cms_cloud_drive_vip_pop_url",
      "qk_vip_pay_modal",
      "camear_vip_retain_pop",
      "cms_lottery_banner",
      "camera_member_lottery_on_off",
      "cms_login_dialog_privacy_alert_enable",
      "cms_cloud_drive_transport_download_pop",
      "cms_share_dialog_universal_enable",
      "cms_camera_asset_popup_activity_new",
      "cms_ai_vip_url_panel",
      "cms_ai_vip_member_page_basic",
      "cms_video_app_grade_config",
      "cms_video_cloud_play_app_grade_config",
      "cms_video_quality_panel_config",
      "cms_realtime_ai_subtitle_tip_config",
      "camera_vip_pay_url",
      "vip_half_recharge_url",
      "quark_vipfull_recharge_url",
      "camera_vip_rights_and_interests_text",
      "cms_quark_action_bar_config",
      "qkscan_member_coupon",
      "qk_novel_noah_sdk_slot_chapter_middle",
      "qk_novel_noah_sdk_slot_bottom_banner",
      "cms_novel_bookshelf_banner",
      "cms_novel_download_banner_config",
      "cms_reward_advideo_auto_trigger",
      "webvideo_show_pay_before_login",
      "cms_cloud_home_nu_card_config",
      "cms_cloud_home_tool_banner",
      "cms_cloud_file_page_share_backup_guide",
      "cms_user_center_welfare_config",
      "cms_skip_button_switch",
      "cloud_drive_tool_list",
      "questionscpagebanner",
      "qkscan_coupon_time",
      "camera_pay_detention",
      "cms_homepage_abtest",
      "cms_camera_export_pay_guide_config",
      "camera_member_lottery_on_off_new",
      "cms_pullactive_enable",
      "cms_quark_doodle",
      "cms_camera_asset_activity_banner_list",
      "camera_keep_modal",
      "cms_cloud_compress_pay_enable",
      "cms_app_act_mgr_data",
      "camera_member_center",
      "minipg_ads_whitelist",
      "airship_config",
      "camera_trial_url",
      "enable_miniframe_prefetch_ad",
      "cms_smart_toolbox_config",
      "cms_pre_order_on_agreement",
      "cms_camera_big_float_window",
      "cms_bookmarkAndHistory_banner_ad",
      "novel_ad_flbanner_close",
      "cms_scanking_home_bubble",
      "cms_poplayer_main",
      "cms_big_float_window",
      "idfa_auth_config",
      "qks_tools_market",
      "cms_homepage_bubble_config",
      "cms_share_link_config",
      "camera_share_link_config",
      "export_file_tips",
      "scan_svip_first_buy_pop",
      "camera_svipplus_pay_url",
      "cms_cloud_pdf_image_pay_enable",
      "minipg_ads_switch_quark",
      "cms_home_appstore_comment_native_item",
      "cms_mini_login_panel",
      "cms_custom_module_config",
      "sk_home_vip_url",
      "camera_assets_membership_url",
      "cms_cloud_pdf_office_pay_enable",
      "cms_dongfeng_common_config",
      "cms_ai_tools_navi_url",
      "cms_camera_tips_dialog",
      "ucdc_server_ip"
    ];

    for (const key of exactKeys) {
      delete obj.result[key];
    }
  }

  body = JSON.stringify(obj);
} catch (e) {}

$done({ body });
