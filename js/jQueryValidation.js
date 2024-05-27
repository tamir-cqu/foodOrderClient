/* validation cannot contain numbers */
$.validator.addMethod("validateName", function (value, element) {
    var v_regex = /^(?=.*\d.*\b)/;
    if (!v_regex.test(value)) {
        return true;
    } else {
        return false;
    }
}, "Name cannot contain numbers");
/* PhoneNumber */
$.validator.addMethod("mobiletxt", function (value, element) {
    var v_regex = /^[04]+\d{8}$/;
    if (v_regex.test(value)) {
        return true;
    } else {
        return false;
    }
}, "10 digits, starting with 04");
/* The postcode has four digits */
$.validator.addMethod("posttxt", function (value, element) {
    var v_regex = /^[\d]{4}$/;
    if (v_regex.test(value)) {
        return true;
    } else {
        return false;
    }
}, "Only four digits are available");
/* Time validation */
$.validator.addMethod("datetime", function (value, element) {
    function isToday(date) {
        return date.toString().slice(0, 10) > new Date().toString().slice(0, 10);
    }
    if (isToday(date)) {
        return true;
    } else {
        return false;
    }

}, "Please select a time after that day");