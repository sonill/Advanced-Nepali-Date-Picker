(function ($) {
	var $body = $('body');

	// initialize date converter
	var converter = new DateConverter();
	converter.setCurrentDate();

	let today =
		converter.nepaliYear +
		'-' +
		converter.nepaliMonth +
		'-' +
		converter.nepaliDate;

	// disable autocomplete
	$('form').attr('autocomplete', 'off');

	// give each calendar instance a unique id
	var cal_no = 1;
	var cur_cal_id = ''; // cur selected calendar id

	// set default date to this month
	var this_year = converter.getNepaliYear();
	var this_month = converter.getNepaliMonth();

	// calendar config
	var start_year = 2000;
	var end_year = 2098;

	// is this single datepicker
	var single_datepicker = 0;
	var locale = 'np';

	// calendar ui selector
	var $year_select = '';
	var $month_select = '';
	var $days_container = '';

	// for multiple selection
	var user_selected_dates = []; // this will hold all the user selected dates
	var last_captured_date = ''; // get last captured date, will be used to select days in multiple selection
	var input_field_name = '';

	// show different message according to os
	var os = 'win';
	var $selector = ''; // currently active selector
	var $form = ''; // parent form of selected selector

	var date_before = '';
	var date_after = '';

	var sel_input;

	var settings = [];

	const updateSettings = (cal_id, newData) => {
		settings.forEach((setting, index) => {
			if (setting.cal_id === cal_id) {
				settings[index] = { cal_id: cal_id, ...newData };
			}
		});
	};

	const getSettingsValue = (cal_id, key = null) => {
		let value = null; // Use null to indicate no match

		// Iterate through each setting
		for (const setting of settings) {
			if (setting.cal_id === cal_id) {
				// If no key is provided, return the entire setting object
				if (!key) {
					return setting;
				}

				// Return the specific key's value
				return setting[key] || null; // Handle missing keys safely
			}
		}

		return value; // Return null if no matching cal_id is found
	};

	$.fn.nepaliDatePicker = function (options) {
		var defaults = $.extend(
			{
				// These are the defaults.
				locale: 'np', // en
				single: false, // enable single or multi date picker
				show_all_dates: false, // show all selected dates as input field value
				date_before: '', // dates before this date will be disabled
				date_after: '', // dates after this date will be disabled
			},
			options
		);

		// detect OS
		if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
			os = 'mac';
		}

		// give calendar a unique id
		$(this).each(function () {
			let $this = $(this);
			const cur_cal = 'cal-' + cal_no;

			// give unique id to each calendar instance
			$(this).attr('data-cur_cal_id', cur_cal);

			// update settings
			settings.push({
				cal_id: cur_cal,
				...defaults,
			});

			cal_no++;

			// add common class to all input fields
			$(this).addClass('andp-date-picker');

			// this will run only once
			// generate input hidden fields if date value already exist
			var default_value = $.trim($(this).attr('value'));

			let data_single = $(this).data('single');
			let data_show_all_dates = $(this).data('show_all_dates');
			let data_date_before = $(this).data('date_before');
			let data_date_after = $(this).data('date_after');
			let data_locale = $(this).data('locale');

			updateSettings(cur_cal, {
				single: data_single || defaults.single,
				show_all_dates: data_show_all_dates || defaults.show_all_dates,
				date_before: data_date_before || defaults.date_before,
				date_after: data_date_after || defaults.date_after,
				locale: data_locale || defaults.locale,
			});

			if (data_single == true || data_single == 1) {
				single_datepicker = 1;
			} else {
				single_datepicker = 0;
			}

			if (default_value && !data_single) {
				// set form
				$form = $(this).parents('form');

				// this will be used to generate hidden input fields with same input name
				input_field_name = $(this).attr('name');

				let default_dates = default_value.split(',');
				default_dates.forEach(function (item, index) {
					generate_hidden_input_fields(item.trim());
				});

				if (data_show_all_dates != true) {
					if (default_dates.length > 1) {
						output_msg = default_dates.length + ' dates selected';
					} else {
						output_msg = default_dates[0];
					}

					// show message to main selector field
					$(this).attr('value', output_msg);
				} else {
					if (!$this.is('input')) {
						// input type is not "input".
						// show all default values into selected container.

						let default_dates = default_value.split(',');
						let temp_markup =
							'<span>' + default_dates.join('</span><span>') + '</span>';
						$this.append(temp_markup);
					}
				}
			}
		});

		// when user clicks in input / selector field
		$(this).click(function () {
			// update globally.
			sel_input = this;

			user_selected_dates = [];
			$selector = $(this);

			cur_cal_id = $(this).attr('data-cur_cal_id');

			let setting = getSettingsValue(cur_cal_id);

			single_datepicker = setting.single;
			locale = setting.locale;
			date_after = setting.date_after;
			date_before = setting.date_before;

			if (date_after) {
				let date_after_ar = date_after.split('-');
				start_year = parseInt(date_after_ar[0]);
			}

			if (date_before) {
				let date_before_ar = date_before.split('-');
				end_year = parseInt(date_before_ar[0]);
			}

			// initiate calendar ui
			init(this);

			if (single_datepicker) {
				// inline calendar
				let selected_date = format_date_yyyy_mm_dd($(this).val());

				// add this date into selected dates arary

				// switch calendar to selected month and year
				if (selected_date.length > 0) {
					older_date_ar = selected_date.split('-');

					$month_select.val(older_date_ar[1]).change();
					$year_select.val(older_date_ar[0]).change();

					select_date(selected_date);
				} else {
					// select default date
					select_date(today, true);
				}
			} else {
				// multi select calendar

				$form = $(this).parents('form');

				// this will be used to generate hidden input fields with same input name
				input_field_name = $(this).attr('name');

				if (input_field_name) {
					// remove name attr from selector
					$(this).removeAttr('name', '').attr('data-name', input_field_name);
				} else {
					// input_field_name is missing
					// get it from data-name
					input_field_name = $(this).attr('data-name');
				}

				var $hidden_publish_dates = $(
					'input.andp-hidden-dates[data-cur_cal_id="' + cur_cal_id + '"]'
				);
				var total_hidden_dates = $hidden_publish_dates.length;

				if (total_hidden_dates > 0) {
					if (total_hidden_dates == 1) {
						selected_date = format_date_yyyy_mm_dd(
							$hidden_publish_dates.eq(0).val()
						);
						older_date_ar = selected_date.split('-');

						$month_select.val(older_date_ar[1]).change();
						$year_select.val(older_date_ar[0]).change();

						// mark all selected dates as selexted in calendar ui.
						select_date(selected_date);
					} else {
						// last selected date
						older_date = $(
							'input.andp-hidden-dates[data-cur_cal_id="' + cur_cal_id + '"]'
						);
						let total_older_date = older_date.length;
						older_date = format_date_yyyy_mm_dd(
							older_date.eq(total_older_date - 1).val()
						);

						// switch calendar to last month and year of selected date
						if (older_date && older_date.length > 0) {
							older_date_ar = older_date.split('-');

							$month_select.val(older_date_ar[1]).change();
							$year_select.val(older_date_ar[0]).change();
						}

						$hidden_publish_dates.each(function () {
							let sel_date = format_date_yyyy_mm_dd($(this).val());

							// mark all selected dates as selexted in calendar ui.
							select_date(sel_date);
						});
					}
				} else {
					// select default date
					select_date(today, true);
				}
			}
		});

		// update days when month or year is changed
		$body.on('change', '.andp-month-select, .andp-year-select', function () {
			generate_days();
		});
	};

	// change months on button click
	$body.on(
		'click',
		'.andp-datepicker-container.open .andp-change-months',
		function (event) {
			// show next month
			selected_month = parseInt($month_select.val());
			selected_year = parseInt($year_select.val());

			if ($(this).hasClass('andp-next')) {
				// next month
				selected_month = selected_month + 1;
				if (selected_month > 12) {
					selected_month = 1;
					selected_year = selected_year + 1;

					if (selected_year > end_year) {
						selected_year = end_year;
						selected_month = 12;
					}
				}
			} else {
				// previous month
				selected_month = selected_month - 1;
				if (selected_month < 1) {
					selected_month = 12;
					selected_year = selected_year - 1;

					if (selected_year < start_year) {
						selected_year = start_year;
						selected_month = 1;
					}
				}
			}

			if (selected_month < 10) {
				selected_month = '0' + selected_month;
			}

			if (selected_year < 10) {
				selected_year = '0' + selected_year;
			}

			$month_select.val(selected_month).change();
			$year_select.val(selected_year).change();
		}
	);

	const localizeNumber = (number) => {
		if (locale === 'np') {
			return number.toLocaleString('ne-NP', { useGrouping: false });
		} else {
			return number;
		}
	};

	// if clicked in days when datepicker is open
	$body.on(
		'click',
		'.andp-datepicker-container.open .andp-days-numbers .day',
		function (event) {
			selected_day = $(this).text();
			selected_date = $(this).data('date');

			if ($(this).hasClass('disabled')) {
				return;
			}

			var $sel_calendar = $(
				'.andp-datepicker-container[data-cur_cal_id="' + cur_cal_id + '"]'
			);

			// disable shift or ctrl key on single_datepicker

			if (single_datepicker) {
				// reset user_selected_dates
				user_selected_dates = [];

				// remove all other selected class
				$sel_calendar.find('.andp-column .day').removeClass('selected');

				// select date function
				select_date(selected_date);

				$sel_calendar.find('.andp-info').hide();

				update_sel_date_in_ui();
			} else {
				// multiple selection

				if (event.shiftKey) {
					// shift key pressed

					var total_captured_dates = user_selected_dates.length;

					if (total_captured_dates > 0) {
						selected_date = $(this).data('date');
						last_captured_date = user_selected_dates[total_captured_dates - 1];

						// get older date
						var smaller_date = find_older_date(
							selected_date,
							last_captured_date
						)
							? last_captured_date
							: selected_date;
						var next_date = smaller_date;

						var days_difference = get_days_difference(
							selected_date,
							last_captured_date
						);

						// reset all captured dates
						user_selected_dates = [];

						$sel_calendar.find('.andp-column .day').removeClass('selected');

						select_date(next_date);

						for (i = 1; i <= days_difference; i++) {
							next_date = get_next_day(next_date);
							select_date(next_date);
						}
					}
				} else if (event.ctrlKey || event.metaKey) {
					// ctrl or cmd key pressed
					select_date(selected_date);
				} else {
					// no  ctrl, shift or cmd key was presed ---------------------

					// reset user_selected_dates
					user_selected_dates = [];

					// remove other selected class
					$sel_calendar.find('.andp-column .day').removeClass('selected');

					// select correct day
					select_date(selected_date);

					// show message for multiple selection
					$sel_calendar.find('.andp-info').show();
				}
			}

			// let other application get selected date through custom event.
			$('document').trigger('andp_date_selected', [
				user_selected_dates,
				sel_input,
			]);
		}
	);

	// close datepicker when clicked outside
	$body.on('click', function (e) {
		var container = $('.andp-datepicker-container, .andp-date-picker');

		// if the target of the click isn't the container nor a descendant of the container
		if (!container.is(e.target) && container.has(e.target).length === 0) {
			$('.andp-datepicker-container').removeClass('open').hide();
		}
	});

	// insert/update date only if appy-date button was clicked
	$body.on('click', '.andp-datepicker-container.open .apply-date', function () {
		update_sel_date_in_ui();
	});

	function format_date_yyyy_mm_dd(date) {
		if (date.length < 1) {
			return '';
		}

		let date_ar = date.split('-');
		let new_date = date_ar[0] + '-';
		new_date += date_ar[1].length == 1 ? '0' + date_ar[1] : date_ar[1];
		new_date += '-';
		new_date += date_ar[2].length == 1 ? '0' + date_ar[2] : date_ar[2];

		return new_date;
	}

	function update_sel_date_in_ui() {
		// do not proceed if no date was selected
		let total_user_selected_dates = user_selected_dates.length;

		if (total_user_selected_dates < 1) {
			$('.andp-datepicker-container').removeClass('open').hide();
			return;
		}

		// some date were selected, proceed ------------------

		// sort date
		user_selected_dates = user_selected_dates.sort(function (a, b) {
			a = a.split('/').reverse().join('');
			b = b.split('/').reverse().join('');
			return a > b ? 1 : a < b ? -1 : 0;
		});

		if (single_datepicker) {
			$selector
				.attr('value', user_selected_dates[0])
				.val(user_selected_dates[0])
				.change();
		} else {
			// destroy previous hidden input fields
			$(
				'input.andp-hidden-dates[data-cur_cal_id="' + cur_cal_id + '"]'
			).remove();

			for (i = 0; i <= total_user_selected_dates - 1; i++) {
				// generate new hidden input fields
				generate_hidden_input_fields(user_selected_dates[i]);
			}

			var output_msg = ''; //user_selected_dates[0];

			let show_all_dates = getSettingsValue(cur_cal_id, 'show_all_dates');

			// console.log('show_all_dates', show_all_dates);

			if (show_all_dates == true) {
				if ($selector.is(':input')) {
					output_msg = user_selected_dates.join(', ');
				} else {
					output_msg =
						'<span>' + user_selected_dates.join('</span><span>') + '</span>';
				}
			} else {
				if (total_user_selected_dates > 1) {
					output_msg = total_user_selected_dates + ' dates selected';
				} else {
					output_msg = user_selected_dates[0];
				}
			}

			// show message to main selector field

			if ($selector.is(':input')) {
				$selector.attr('value', output_msg).val(output_msg);
			} else {
				$selector.html(output_msg);
			}
		}

		$('.andp-datepicker-container').removeClass('open').hide();

		selected_date = $(this).data('date');
	}

	function init(this_sel) {
		// close other instance of calendar
		$('.andp-datepicker-container').removeClass('open').hide();

		// check if calendar ui has already been generated for selected cur_cal_id
		var $sel_calendar = $(
			'.andp-datepicker-container[data-cur_cal_id="' + cur_cal_id + '"]'
		);
		if ($sel_calendar.length > 0) {
			$year_select = $sel_calendar.find('.andp-year-select');
			$month_select = $sel_calendar.find('.andp-month-select');
			$days_container = $sel_calendar.find('.andp-days-numbers');
			$sel_calendar.addClass('open').show();

			fix_calendar_alignment();
			return;
		}

		var template =
			'<div class="andp-datepicker-container" data-cur_cal_id="' +
			cur_cal_id +
			'" >';
		template += '<div class = "andp-header">';
		template +=
			'<button type = "button"  class = "andp-prev andp-change-months"> &#10094; </button>';
		template += '<select class = "andp-month-select"> </select>';
		template += '<select class = "andp-year-select"> </select>';
		template +=
			'<button type = "button" class = "andp-next andp-change-months"> &#10095; </button> ';
		template += '</div>';
		template += '<div class="andp-body">';

		if (locale == 'np') {
			template +=
				'<div class = "andp-days-names"> <div> आ </div> <div> सो </div> <div> मं </div> <div> बु </div> <div> बि </div> <div> शु </div> <div> श </div> </div>';
		} else {
			template +=
				'<div class = "andp-days-names"> <div> SUN </div> <div> MON </div> <div> TUE </div> <div> WED </div> <div> THU </div> <div> FRI </div> <div> SAT </div> </div>';
		}

		template += '<div class = "andp-days-numbers"> </div>';

		if (!single_datepicker) {
			if (os == 'mac') {
				control_key = 'CMD';
			} else {
				control_key = 'CTRL';
			}
			template +=
				'<div class="andp-info" style="display:none"><i class="mdi mdi-information text-primary"></i> ' +
				(locale === 'en'
					? 'Press <strong>' +
					  control_key +
					  '</strong> or <strong>Shift</strong> key for multiple selection '
					: '<strong>' +
					  control_key +
					  '</strong> अथवा <strong>Shift</strong> दबाउनुश') +
				'</div>';
		}
		template += '<div class="andp-action-btns">';

		if (!single_datepicker) {
			template +=
				'<button type="button" class="apply-date" data-cur_cal_id="' +
				cur_cal_id +
				'">' +
				(locale === 'np' ? 'सेभ गर्नु' : 'Apply') +
				'</button>';
		}
		template += '</div>';
		template += '</div>';
		template += '</div>';

		// insert into DOM
		$body.append(template);

		// re-initiate var, wont work otherwise
		$sel_calendar = $(
			'.andp-datepicker-container[data-cur_cal_id="' + cur_cal_id + '"]'
		);

		$year_select = $sel_calendar.find('.andp-year-select');
		$month_select = $sel_calendar.find('.andp-month-select');
		$days_container = $sel_calendar.find('.andp-days-numbers');

		// add month into month select
		append_html =
			'<option value = "01" ' +
			('01' == this_month ? 'selected' : ' ') +
			' > ' +
			(locale === 'np' ? 'बैशाख' : 'Baisakh') +
			'</option>';
		append_html +=
			'<option value = "02" ' +
			('02' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'जेठ' : 'Jestha') +
			'</option>';
		append_html +=
			'<option value = "03" ' +
			('03' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'असार' : 'Asar') +
			'</option>';
		append_html +=
			'<option value = "04" ' +
			('04' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'साउन' : 'Shrawan') +
			'</option>';
		append_html +=
			'<option value = "05" ' +
			('05' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'भदौ' : 'Bhadra') +
			'</option>';
		append_html +=
			'<option value = "06" ' +
			('06' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'असोज' : 'Ashoj') +
			'</option>';
		append_html +=
			'<option value = "07" ' +
			('07' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'कार्तिक' : 'Kartik') +
			'</option>';
		append_html +=
			'<option value = "08" ' +
			('08' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'मंसिर' : 'Mangsir') +
			'</option>';
		append_html +=
			'<option value = "09" ' +
			('09' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'पुष' : 'Poush') +
			'</option>';
		append_html +=
			'<option value = "10" ' +
			('10' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'माघ' : 'Magh') +
			'</option>';
		append_html +=
			'<option value = "11" ' +
			('11' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'फागुन' : 'Falgun') +
			'</option>';
		append_html +=
			'<option value = "12" ' +
			('12' == this_month ? 'selected' : '') +
			' > ' +
			(locale === 'np' ? 'चैत' : 'Chaitra') +
			'</option>';

		$month_select.append(append_html);

		// add year into year select
		for (i = start_year; i <= end_year; i++) {
			append_html = '<option value="' + i + '"';
			if (i == this_year) {
				append_html += ' selected';
			}
			append_html += '>' + localizeNumber(i) + '</option>';
			$year_select.append(append_html);
		}

		generate_days();

		$(
			'.andp-datepicker-container[data-cur_cal_id="' + cur_cal_id + '"]'
		).addClass('open');

		fix_calendar_alignment();
	}

	function fix_calendar_alignment() {
		// fix calendar layout and position in dom
		var elem_pos = $selector.offset();
		var elem_height = $selector.outerHeight();

		var document_width = $(window).width();
		var selector_width = $selector.outerWidth();
		var calendar_width = $('.andp-datepicker-container').outerWidth();

		if (calendar_width + elem_pos.left + 10 > document_width) {
			var right_offset = document_width - (elem_pos.left + selector_width);
			$('.andp-datepicker-container[data-cur_cal_id="' + cur_cal_id + '"]').css(
				{
					top: elem_pos.top + elem_height,
					right: right_offset,
					left: 'inherit',
				}
			);
		} else {
			$('.andp-datepicker-container[data-cur_cal_id="' + cur_cal_id + '"]').css(
				{
					top: elem_pos.top + elem_height,
					left: elem_pos.left,
					right: 'inherit',
				}
			);
		}
	}

	function generate_days() {
		month = $month_select.val();
		year = $year_select.val();

		$days_container.html('');

		var selected_date_obj = new DateConverter();
		selected_date_obj.setNepaliDate(year, month, 1);

		var month_start_day = selected_date_obj.getDay();
		var total_days_in_selected_month = getDaysInMonth(year, month);

		append_html = '';
		var y = 1; // year
		var j = 1;
		var k = parseInt(month_start_day) - 2;
		var l = 1;
		for (i = 1; i <= 42; i++) {
			last_month = parseInt(month) - 1;
			last_year = parseInt(year);

			if (last_month < 1) {
				last_month = 12;
				last_year = last_year - 1;

				if (last_year < start_year) {
					last_year = start_year;
					last_month = 1;
				}
			}

			next_month = parseInt(month) + 1;
			next_year = parseInt(year);

			var total_days_in_last_month = getDaysInMonth(last_year, last_month);

			if (y == 1) {
				append_html += '<div class="andp-column">';
			}

			if (i < month_start_day) {
				append_html +=
					'<div class="old-dates"> ' +
					localizeNumber(parseInt(total_days_in_last_month - k)) +
					' </div>';
				k = k - 1;
			} else {
				if (j <= total_days_in_selected_month) {
					let day = j < 10 ? '0' + j : j;
					let proper_date = year + '-' + month + '-' + day;
					let ar_index = user_selected_dates.indexOf(proper_date);

					console.log('ar_index', ar_index, proper_date, user_selected_dates);

					let compare_date_after = converter.compareDate(
						proper_date,
						date_after
					);
					let compare_date_before = converter.compareDate(
						proper_date,
						date_before
					);

					let css_class = '';

					if (compare_date_after == 2 ? ' disabled old-dates' : '') {
						css_class = ' disabled old-dates';
					} else if (compare_date_before == 1 ? ' disabled old-dates' : '') {
						css_class = ' disabled old-dates';
					} else {
						css_class = 'day';
					}

					// ( ( ar_index >= 0 ) ? ' selected' : '' ) = mark selected days as selected, even after calendar close or year/month change.
					append_html +=
						'<div class="' +
						css_class +
						(ar_index >= 0 ? ' selected' : '') +
						'" data-date="' +
						proper_date +
						'">' +
						localizeNumber(j) +
						'</div>';
					j++;
				} else {
					append_html +=
						'<div  class="old-dates"> ' + localizeNumber(l) + '</div>';
					l++;
				}
			}

			if (y == 7) {
				append_html += '</div>';
				y = 0;
			}

			y++;
		}

		$days_container.append(append_html);
	}

	function getDaysInMonth(year, month) {
		var converter = new DateConverter();

		if (year < start_year || year > end_year) return;
		if (month < 1 || month > 12) return;

		var year = year - start_year;
		var month = month - 1;

		return converter.nepaliMonths[year][month];
	}

	function get_days_difference(date_1, date_2) {
		date_1 = date_1.split('-');
		date_2 = date_2.split('-');

		var converter = new DateConverter();
		converter.setNepaliDate(date_1[0], date_1[1], date_1[2]);
		return converter.getNepaliDateDifference(date_2[0], date_2[1], date_2[2]);
	}

	function find_older_date(date_1, date_2) {
		date_1 = date_1.split('-');
		date_2 = date_2.split('-');

		var converter = new DateConverter();
		converter.setNepaliDate(date_1[0], date_1[1], date_1[2]);
		var date_1_eng = [
			converter.getEnglishYear(),
			converter.getEnglishMonth(),
			converter.getEnglishDate(),
		];

		converter.setNepaliDate(date_2[0], date_2[1], date_2[2]);
		var date_2_eng = [
			converter.getEnglishYear(),
			converter.getEnglishMonth(),
			converter.getEnglishDate(),
		];

		var firstDate = new Date(date_1_eng[0], date_1_eng[1], date_1_eng[2]);
		var secondDate = new Date(date_2_eng[0], date_2_eng[1], date_2_eng[2]);

		if (firstDate > secondDate) {
			return 1;
		} else {
			return false;
		}
	}

	function get_next_day(date_1) {
		date_1 = date_1.split('-');

		year = parseInt(date_1[0]);
		month = parseInt(date_1[1]);

		var days_in_month = parseInt(getDaysInMonth(year, month));

		day = parseInt(date_1[2]) + 1;
		if (day > days_in_month) {
			day = 1;
			month = month + 1;

			if (month > 12) {
				month = 1;
				year = year + 1;
			}
		}

		return year + '-' + month + '-' + day;
	}

	function select_date(selected_date, soft_select = false) {
		selected_date = format_date_yyyy_mm_dd(selected_date);

		var ar_index = user_selected_dates.indexOf(selected_date); // check if selected_date already exists in user_selected_date
		var $sel_calendar = $(
			'.andp-datepicker-container[data-cur_cal_id="' + cur_cal_id + '"]'
		);
		var $this = $sel_calendar.find('.day[data-date="' + selected_date + '"]');

		if (soft_select) {
			$this.addClass('soft-select');
		} else {
			if (ar_index < 0) {
				// date does not exist in  user_selected_dates array
				// add selected date into user_selected_dates array
				user_selected_dates.push(selected_date);

				// mark this day as selected
				$this.addClass('selected');
			} else {
				// date already added
				// remove this date from array
				user_selected_dates.splice(ar_index, 1);

				// mark as not selected
				$this.removeClass('selected');
			}
		}
	}

	function generate_hidden_input_fields(value) {
		$form.append(
			'<input class="andp-hidden-dates" type="hidden" data-cur_cal_id="' +
				cur_cal_id +
				'" name="' +
				input_field_name +
				'[]" value="' +
				value +
				'">'
		);
	}

	function DateConverter() {
		this.englishMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		this.englishLeapMonths = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

		this.nepaliMonths = [
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], //2000
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], //2001
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2002
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], // 2003
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2004
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2005
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2006
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], // 2006
			[31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31], // 2007
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2008
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2009
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], // 2010
			[31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
			[31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
			[31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
			[31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
			[31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
			[31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2071
			[31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2072
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31], // 2073
			[31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], // 2074
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2075
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 2076
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2077
			[31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30], // 2078
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2079
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30], // 2080
			[31, 31, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2081
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2082
			[31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], // 2083
			[31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], // 2084
			[31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30], // 2085
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2086
			[31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30], // 2087
			[30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30], // 2088
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2089
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2090
			[31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30], // 2091
			[30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2092
			[30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2093
			[31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30], // 2094
			[31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30], // 2095
			[30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2096
			[31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30], // 2097
			[31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 29, 31], // 2098
			[31, 31, 32, 31, 31, 31, 30, 29, 29, 30, 30, 30], // 2099
		];

		this.setCurrentDate = function () {
			var d = new Date();
			this.setEnglishDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
		};

		//English to Nepali date conversion

		this.setEnglishDate = function (year, month, date) {
			if (!this.isEnglishRange(year, month, date))
				throw new Exception('Invalid date format.');

			this.englishYear = year;
			this.englishMonth = month;
			this.englishDate = date;

			//Setting nepali reference to 2000/1/1 with english date 1943/4/14
			this.nepaliYear = 2000;
			this.nepaliMonth = 1;
			this.nepaliDate = 1;

			var difference = this.getEnglishDateDifference(1943, 4, 14);

			//Getting nepali year untill the difference remains less than 365
			var index = 0;
			while (difference >= this.nepaliYearDays(index)) {
				this.nepaliYear++;
				difference = difference - this.nepaliYearDays(index);
				index++;
			}

			//Getting nepali month untill the difference remains less than 31
			var i = 0;
			while (difference >= this.nepaliMonths[index][i]) {
				difference = difference - this.nepaliMonths[index][i];
				this.nepaliMonth++;
				i++;
			}

			//Remaning days is the date;
			this.nepaliDate = this.nepaliDate + difference;

			this.getDay();
		};

		this.toEnglishString = function (format) {
			if (typeof format === 'undefined') format = '-';
			return (
				this.englishYear +
				format +
				this.englishMonth +
				format +
				this.englishDate
			);
		};

		this.getEnglishDateDifference = function (year, month, date) {
			//Getting difference from the current date with the date provided
			var difference =
				this.countTotalEnglishDays(
					this.englishYear,
					this.englishMonth,
					this.englishDate
				) - this.countTotalEnglishDays(year, month, date);
			return difference < 0 ? -difference : difference;
		};

		this.countTotalEnglishDays = function (year, month, date) {
			var totalDays = year * 365 + date;

			for (var i = 0; i < month - 1; i++)
				totalDays = totalDays + this.englishMonths[i];

			totalDays = totalDays + this.countleap(year, month);
			return totalDays;
		};

		this.countleap = function (year, month) {
			if (month <= 2) year--;

			return (
				Math.floor(year / 4) - Math.floor(year / 100) + Math.floor(year / 400)
			);
		};

		this.isEnglishRange = function (year, month, date) {
			if (year < 1944 || year > 2042) return false;

			if (month < 1 || month > 12) return false;

			if (date < 1 || date > 31) return false;

			return true;
		};

		this.isLeapYear = function (year) {
			if (year % 4 === 0) {
				return year % 100 === 0 ? year % 400 === 0 : true;
			} else return false;
		};

		//Nepali to English conversion

		this.setNepaliDate = function (year, month, date) {
			if (!this.isNepaliRange(year, month, date)) {
				console.log('Invalid Date Format');
				// throw new Exception("Invalid date format.");
				return;
			}

			this.nepaliYear = year;
			this.nepaliMonth = month;
			this.nepaliDate = date;

			//Setting english reference to 1944/1/1 with nepali date 2000/9/17
			this.englishYear = 1944;
			this.englishMonth = 1;
			this.englishDate = 1;

			var difference = this.getNepaliDateDifference(2000, 9, 17);

			//Getting english year untill the difference remains less than 365
			while (difference >= (this.isLeapYear(this.englishYear) ? 366 : 365)) {
				difference =
					difference - (this.isLeapYear(this.englishYear) ? 366 : 365);
				this.englishYear++;
			}

			//Getting english month untill the difference remains less than 31
			var monthDays = this.isLeapYear(this.englishYear)
				? this.englishLeapMonths
				: this.englishMonths;
			var i = 0;
			while (difference >= monthDays[i]) {
				this.englishMonth++;
				difference = difference - monthDays[i];
				i++;
			}

			//Remaning days is the date;
			this.englishDate = this.englishDate + difference;

			this.getDay();
		};

		this.toNepaliString = function (format) {
			if (typeof format === 'undefined') format = '-';
			return (
				this.nepaliYear + format + this.nepaliMonth + format + this.nepaliDate
			);
		};

		this.getNepaliDateDifference = function (year, month, date) {
			//Getting difference from the current date with the date provided
			var difference =
				this.countTotalNepaliDays(
					this.nepaliYear,
					this.nepaliMonth,
					this.nepaliDate
				) - this.countTotalNepaliDays(year, month, date);
			return difference < 0 ? -difference : difference;
		};

		this.countTotalNepaliDays = function (year, month, date) {
			var total = 0;
			if (year < 2000) return 0;

			total = total + (date - 1);

			var yearIndex = year - 2000;
			for (var i = 0; i < month - 1; i++)
				total = total + this.nepaliMonths[yearIndex][i];

			for (var i = 0; i < yearIndex; i++)
				total = total + this.nepaliYearDays(i);

			return total;
		};

		this.nepaliYearDays = function (index) {
			var total = 0;

			for (var i = 0; i < 12; i++) total += this.nepaliMonths[index][i];

			return total;
		};

		this.isNepaliRange = function (year, month, date) {
			if (year < 2000 || year > 2098) return false;

			if (month < 1 || month > 12) return false;

			if (date < 1 || date > this.nepaliMonths[year - 2000][month - 1])
				return false;

			return true;
		};

		//Class Regular methods

		this.getDay = function () {
			//Reference date 1943/4/14 Wednesday
			var difference = this.getEnglishDateDifference(1943, 4, 14);
			this.weekDay = ((3 + (difference % 7)) % 7) + 1;
			return this.weekDay;
		};

		this.getEnglishYear = function () {
			return this.englishYear;
		};

		this.getEnglishMonth = function () {
			return this.englishMonth;
		};

		this.getEnglishDate = function () {
			return this.englishDate;
		};

		this.getNepaliYear = function () {
			return this.nepaliYear;
		};

		this.getNepaliMonth = function () {
			return this.nepaliMonth;
		};

		this.getNepaliDate = function () {
			return this.nepaliDate;
		};

		this.compareDate = function (date1, date2) {
			// 1  = date 1 is later / bigger
			// 0 = both dates are equal
			// 2 = date 2 is later / bigger

			if (!date1 || !date2) return 0;

			const [year1, month1, day1] = date1.split('-').map(Number);
			const [year2, month2, day2] = date2.split('-').map(Number);

			if (year1 < year2) return 2;
			if (year1 > year2) return 1;

			if (month1 < month2) return 2;
			if (month1 > month2) return 1;

			if (day1 < day2) return 2;
			if (day1 > day2) return 1;

			return 0;
		};
	}
})(jQuery);
