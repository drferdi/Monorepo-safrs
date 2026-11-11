app_name = "sentra_mantra_core"
app_title = "Sentra MANTRA Core"
app_publisher = "Sentra"
app_description = "Shared cross-cutting domain logic and utilities for Sentra MANTRA (per ADR-0001 S3)"
app_email = "drferdiiskandar@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "sentra_mantra_core",
# 		"logo": "/assets/sentra_mantra_core/logo.png",
# 		"title": "Sentra MANTRA Core",
# 		"route": "/sentra_mantra_core",
# 		"has_permission": "sentra_mantra_core.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/sentra_mantra_core/css/desk_topbar.css?v=11"  # naikkan ?v= tiap edit CSS (cache-buster)
app_include_js = "/assets/sentra_mantra_core/js/desk_attribution.js?v=3"

# include js, css files in header of web template
web_include_css = "/assets/sentra_mantra_core/css/web_attribution.css?v=3"
# web_include_js = "/assets/sentra_mantra_core/js/sentra_mantra_core.js"

# Desk boot — attribution copy for footer (see ui_defaults.boot_session)
extend_bootinfo = "sentra_mantra_core.ui_defaults.boot_session"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "sentra_mantra_core/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "sentra_mantra_core/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "sentra_mantra_core.utils.jinja_methods",
# 	"filters": "sentra_mantra_core.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "sentra_mantra_core.install.before_install"
# after_install = "sentra_mantra_core.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "sentra_mantra_core.uninstall.before_uninstall"
# after_uninstall = "sentra_mantra_core.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "sentra_mantra_core.utils.before_app_install"
# after_app_install = "sentra_mantra_core.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "sentra_mantra_core.utils.before_app_uninstall"
# after_app_uninstall = "sentra_mantra_core.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "sentra_mantra_core.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# Kartu Keputusan hanya terlihat oleh pemegang audience_role-nya. Ditegakkan di
# lapisan kueri (daftar/laporan) dan pada pembacaan dokumen tunggal.
permission_query_conditions = {
	"Sentra Decision Card": "sentra_mantra_core.agents.permissions.decision_card_query_conditions",
}

has_permission = {
	"Sentra Decision Card": "sentra_mantra_core.agents.permissions.has_decision_card_permission",
}

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Material Request": {
		"validate": "sentra_mantra_core.purchase_controls.validate_material_request",
	},
	"Expense Claim": {
		"validate": "sentra_mantra_core.purchase_controls.validate_expense_claim",
	},
	"Purchase Receipt": {
		"validate": "sentra_mantra_core.purchase_controls.validate_purchase_receipt",
	},
	"Purchase Invoice": {
		"validate": "sentra_mantra_core.purchase_controls.validate_purchase_invoice",
	},
	"Payment Entry": {
		"validate": "sentra_mantra_core.purchase_controls.validate_payment_entry",
	},
}

# Scheduled Tasks
# ---------------

# Agen harian jalan 05.30 supaya kartu siap sebelum 06.00 (spesifikasi §5).
scheduler_events = {
	"cron": {
		# Kedaluwarsa jalan sebelum agen: Chamber bersih dulu, baru kartu hari
		# ini masuk — dan kondisi yang masih berlaku boleh terbit lagi pagi itu.
		"15 5 * * *": ["sentra_mantra_core.agents.runner.expire_overdue_cards"],
		"30 5 * * *": ["sentra_mantra_core.agents.runner.run_daily_agents"],
		"30 5 * * 1": ["sentra_mantra_core.agents.runner.run_weekly_agents"],
	}
}

# scheduler_events = {
# 	"all": [
# 		"sentra_mantra_core.tasks.all"
# 	],
# 	"daily": [
# 		"sentra_mantra_core.tasks.daily"
# 	],
# 	"hourly": [
# 		"sentra_mantra_core.tasks.hourly"
# 	],
# 	"weekly": [
# 		"sentra_mantra_core.tasks.weekly"
# 	],
# 	"monthly": [
# 		"sentra_mantra_core.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "sentra_mantra_core.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "sentra_mantra_core.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "sentra_mantra_core.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["sentra_mantra_core.utils.before_request"]
# after_request = ["sentra_mantra_core.utils.after_request"]

# Job Events
# ----------
# before_job = ["sentra_mantra_core.utils.before_job"]
# after_job = ["sentra_mantra_core.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"sentra_mantra_core.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []
