const domainUrl = "http://localhost:3000";
$(document).ready(function () {
  var selectedItem = {};
  var restaurantId = -1;

  // Login validation and submission
  $("#loginForm").validate({
    focusInvalid: false,
    onkeyup: false,
    rules: {
      email: {
        required: true,
        email: true,
      },
      password: {
        required: true,
      },
    },
    messages: {
      email: {
        required: "Please enter your email address.",
        email: "Please enter a valid email address.",
      },
      password: {
        required: "Please enter your password.",
      },
    },
    submitHandler: function (form) {
      var formData = $(form).serializeArray();
      var inputData = {};
      formData.forEach(function (data) {
        inputData[data.name] = data.value;
      });
      $.post(`${domainUrl}/verifyUser`, inputData)
        .done(function (data) {
          if (data.length > 0) {
            var user = data[0];
            localStorage.setItem("userInfo", JSON.stringify(user));
            localStorage.setItem("userId", user._id);
            localStorage.removeItem("orders");
            $(".user-name").text(user.firstName + " " + user.lastName);

            $.mobile.changePage("#homePage");
          } else {
            alert("Login failed");
          }
          $("#loginForm").trigger("reset");
        })
        .fail(function (xhr, status, error) {
          console.error("Request failed:", status, error);
          alert("Login request failed. Please try again later.");
        });
    },
  });

  // Fetch restaurants data
  $(document).on("pagecreate", "#restaurantListPage", function () {
    $.get(`${domainUrl}/restaurants`, function (data, status) {
      if (status === "success") {
        var $list = $("#restaurantList");
        $list.empty();

        $.each(data, function (i, restaurant) {
          var $listItem = $(
            `<li><a href="#menuItemsPage" data-id="${restaurant._id}" data-transition="slide"><img src="${restaurant.image_source}" alt="${restaurant.name}"><h2>${restaurant.name}</h2><p>${restaurant.description}</p>
            </a>
            <a href="#reviewPopup" data-id="${restaurant._id}" class="review-button"></a>
            </li>`
          );
          $list.append($listItem);
        });

        $list.listview("refresh");
      } else {
        console.error("Failed to fetch restaurants. Status: " + status);
        alert("Failed to load the restaurant list. Please try again later.");
      }
    });
  });

  $(document).on("click", ".review-button", function () {
    restaurantId = $(this).data("id");
  });

  $(document).on("click", ".review-submit-button", function () {
    var userId = localStorage.getItem("userId");

    var reviewData = {
      restaurant_id: restaurantId,
      review: $("#reviewText").val(),
      user_id: userId,
    };

    $.post(`${domainUrl}/submitReview`, reviewData)
      .done(function (data, status) {
        alert("Review submitted successfully!");
        $.mobile.changePage("#restaurantListPage", {
          reverse: true,
        });
      })
      .fail(function (xhr, status, error) {
        console.error("Error during checkout:", status, error);
      });
  });

  $(document).on("pageshow", "#reviewPopup", function () {
    $("#reviewText").val("");
  });

  // Event handler for restaurant list item clicks
  $(document).on("click", "#restaurantList li a", function (event) {
    restaurantId = $(this).data("id");
    $.get(`${domainUrl}/menuItems/${restaurantId}`, function (data, status) {
      if (status === "success") {
        var $list = $("#menuItemList");
        $list.empty();

        $.each(data, function (i, item) {
          var $listItem = $(`
                      <li>
                          <a href="#" data-id="${item._id}" data-transition="slide">
                              <img src="${item.image_source}" alt="${item.name}" class="item-img">
                              <h3 class="item-name">${item.name}</h3>
                              <p>
                                  <span class="item-desc">${item.description}</span>
                                  <span class="item-price" data-item-price="${item.price}"><strong>$${item.price}</strong></span>
                              </p>
                          </a>
                      </li>`);
          $list.append($listItem);
        });

        $list.listview("refresh");
      } else {
        console.error("Failed to fetch restaurant details. Status: " + status);
        alert("Failed to load the restaurant details. Please try again later.");
      }
    });
  });

  // Event handler for menu list item clicks
  $("#menuItemList").on("click", "li", function () {
    selectedItem.id = $(this).find("a").data("id");
    selectedItem.name = $(this).find(".item-name").text();
    selectedItem.price = $(this).find(".item-price").data("item-price");
    selectedItem.description = $(this).find(".item-desc").text();
    selectedItem.image = $(this).find(".item-img").attr("src");

    $.mobile.changePage("#addOrderPage", {
      transition: "slide",
    });
  });

  // Initiate order page
  $("#addOrderPage").on("pagebeforeshow", function () {
    $(".item-name").text(selectedItem.name);
    $(".item-price").text(selectedItem.price);
    $(".item-desc").text(selectedItem.description);
    $(".item-image").attr("src", selectedItem.image);
    $("#item-count").val(1);

    var initialCount = parseInt($("#item-count").val());
    var initialTotalPrice = initialCount * parseFloat(selectedItem.price);
    $("#total-price").text(initialTotalPrice.toFixed(2));
  });

  // Confirm order button click handler
  $("#addToBasket").on("click", function () {
    var count = parseInt($("#item-count").val());
    var totalPrice = count * selectedItem.price;

    var order = {
      id: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price,
      count: count,
      totalPrice: totalPrice.toFixed(2),
      description: selectedItem.description,
      image: selectedItem.image,
    };

    // Retrieve existing orders from local storage
    var orders = JSON.parse(localStorage.getItem("orders")) || [];
    orders.push(order);

    // Save back to local storage
    localStorage.setItem("orders", JSON.stringify(orders));

    $.mobile.changePage("#menuItemsPage", {
      transition: "slide",
      reverse: true,
    });
  });

  $("#minus-button").click(function () {
    var count = parseInt($("#item-count").val());
    if (count > 1) {
      $("#item-count")
        .val(count - 1)
        .change();
    }
  });

  $("#plus-button").click(function () {
    var count = parseInt($("#item-count").val());
    $("#item-count")
      .val(count + 1)
      .change();
  });

  $("#item-count").change(function () {
    var count = parseInt($(this).val());
    var price = parseFloat(selectedItem.price);
    var totalPrice = (count * price).toFixed(2);
    $("#total-price").text(totalPrice);
  });

  $("#clearBasketButton").click(function () {
    localStorage.removeItem("orders");
    loadBasketItems();
  });

  $("#basketPage").on("pageshow", function () {
    loadBasketItems();
  });

  function loadBasketItems() {
    var orders = JSON.parse(localStorage.getItem("orders")) || [];
    var $basketItemList = $("#basketItemList");
    $basketItemList.empty();
    var totalBasketPrice = 0;

    orders.forEach(function (order) {
      var listItem = `
            <li>
                <img src="${order.image}" class="item-img" />
                <h2 class="item-name">${order.name}</h2>
                <p> <span class="item-count">Qty: ${order.count}</span>, <span class="item-total-price">Total Price: $${order.totalPrice}</span></p>
            </li>
        `;
      $basketItemList.append(listItem);
      totalBasketPrice += parseFloat(order.totalPrice);
    });

    $basketItemList.listview("refresh");
    $("#basket-total-price").text(`$${totalBasketPrice.toFixed(2)}`);
  }

  $("#checkoutButton").on("click", function () {
    var orders = JSON.parse(localStorage.getItem("orders")) || [];
    var userId = localStorage.getItem("userId");

    var orderData = {
      userId: userId,
      orders: orders,
    };

    $.post(`${domainUrl}/checkout`, orderData)
      .done(function (data) {
        console.log("Orders placed successfully:", data);
        localStorage.removeItem("orders");
        $.mobile.changePage("#homePage", {
          transition: "slide",
        });
      })
      .fail(function (xhr, status, error) {
        console.error("Error during checkout:", status, error);
      });
  });

  $(document).on("pagebeforeshow", "#orderListPage", function () {
    var userId = localStorage.getItem("userId");
    $.get(`${domainUrl}/orderList/${userId}`, function (data, status) {
      if (status === "success") {
        var $list = $("#orderList");
        $list.empty();

        $.each(data, function (i, order) {
          var totalPrice = 0;
          var itemsHtml = order.items
            .map(function (item) {
              var itemTotalPrice = item.count * item.price;
              totalPrice += itemTotalPrice;
              return `<p>${
                item.name
              } - Qty:${item.count}, $${item.count * item.price}</p>`;
            })
            .join("");

          var $listItem = $(
            `<li><div data-id="${
              order._id
            }" data-transition="slide"><h2>${new Date(
              order.date
            ).toLocaleString()}</h2>${itemsHtml}
            
            <hr>
            <p><strong>Total Price: $${totalPrice.toFixed(2)}</strong></p>
            </div></li>`
          );
          $list.append($listItem);
        });

        $list.listview("refresh");
      } else {
        console.error("Failed to fetch restaurant details. Status: " + status);
        alert("Failed to load the restaurant details. Please try again later.");
      }
    });
  });

  $(document).on("pagecontainerbeforehide", function () {
    $("[data-role='navbar'] a").removeClass("ui-btn-active");
  });

  $(document).on("pagecontainershow", function () {
    var currentPageId = $.mobile.pageContainer
      .pagecontainer("getActivePage")
      .prop("id");
    $("[data-role='navbar'] a[href='#" + currentPageId + "']").addClass(
      "ui-btn-active"
    );
  });

  // Fetch last 3 orders and populate the latest orders list
  $(document).on("pagebeforeshow", "#homePage", function () {
    var userId = localStorage.getItem("userId");
    $.get(`${domainUrl}/orderList/${userId}`, function (data, status) {
      if (status === "success") {
        var $list = $("#latestOrdersList");
        $list.empty();

        $.each(data, function (i, order) {
          var totalPrice = 0;
          var itemsHtml = order.items
            .map(function (item) {
              var itemTotalPrice = item.count * item.price;
              totalPrice += itemTotalPrice;
              return `<p>${
                item.name
              } - Qty:${item.count}, $${item.count * item.price}</p>`;
            })
            .join("");

          var $listItem = $(
            `<li><div data-id="${
              order._id
            }" data-transition="slide"><h2>${new Date(
              order.date
            ).toLocaleString()}</h2>${itemsHtml}
            
            <hr>
            <p><strong>Total Price: $${totalPrice.toFixed(2)}</strong></p>
            </div></li>`
          );
          $list.append($listItem);
        });

        $list.listview("refresh");
      } else {
        console.error("Failed to fetch restaurant details. Status: " + status);
        alert("Failed to load the restaurant details. Please try again later.");
      }
    });

    $.get(`${domainUrl}/restaurants`, function (data, status) {
      if (status === "success") {
        var $list = $("#suggestedRestaurants");
        $list.empty();

        $.each(data, function (i, restaurant) {
          var $listItem = $(
            `<li><a href="#menuItemsPage" data-id="${restaurant._id}" data-transition="slide"><img src="${restaurant.image_source}" alt="${restaurant.name}"><h2>${restaurant.name}</h2><p>${restaurant.description}</p></a></li>`
          );
          $list.append($listItem);
        });

        $list.listview("refresh");
      } else {
        console.error("Failed to fetch restaurants. Status: " + status);
        alert("Failed to load the restaurant list. Please try again later.");
      }
    });

    $.get(`${domainUrl}/reviews`, function (data, status) {
      if (status === "success") {
        var $list = $("#reviewList");
        $list.empty();

        $.each(data, function (i, review) {
          var $listItem = $(
            `
            <li data-role="list-divider">${new Date(
              review.date
            ).toLocaleString()}</li>
            <li>
              <h2>${review.restaurantName}</h2>
              <p>
                <strong> ${review.userName}</strong>
              </p>
              <p>${review.review}</p>
          </li>
            `
          );
          $list.append($listItem);
        });
        $list.listview("refresh");
      } else {
        console.error("Failed to fetch reviews. Status: " + status);
        alert("Failed to load the review list. Please try again later.");
      }
    });
  });

  // Initialization before login page is displayed
  $(document).on("pagebeforeshow", "#loginPage", function () {
    localStorage.removeItem("userInfo");
    authenticated = false;
  });

  $("#signupForm").validate({
    focusInvalid: false,
    onkeyup: false,
    submitHandler: function (form) {
      var formData = $(form).serializeArray();
      var userInfo = {};

      formData.forEach(function (data) {
        userInfo[data.name] = data.value;
      });

      $.post(`${domainUrl}/postUserData`, userInfo)
        .done(function (data, status, xhr) {
          localStorage.setItem("authenticated", true);
          alert("Successfully signed up.");
          localStorage.setItem("userInfo", JSON.stringify(userInfo));
          localStorage.setItem("userId", data._id);
          $(".user-name").text(userInfo.firstName + " " + userInfo.lastName);
          $.mobile.changePage("#homePage");
        })
        .fail(function (xhr, status, error) {
          alert("Sign up failed: " + xhr.responseText);
        });
    },

    // Validation rules
    rules: {
      email: {
        required: true,
        email: true,
      },
      password: {
        required: true,
        rangelength: [3, 10],
      },
      firstName: {
        required: true,
        rangelength: [1, 15],
        validateName: true,
      },
      lastName: {
        required: true,
        rangelength: [1, 15],
        validateName: true,
      },
      phoneNumber: {
        required: true,
        mobiletxt: true,
      },
      address: {
        required: true,
        rangelength: [1, 25],
      },
      postcode: {
        required: true,
        posttxt: true,
      },
    },

    // Validation messages
    messages: {
      email: {
        required: "Please enter your email",
        email: "The email format is incorrect",
      },
      password: {
        required: "Password cannot be empty",
        rangelength: $.validator.format(
          "Minimum Password Length: {0}, Maximum Password Length: {1}。"
        ),
      },
      firstName: {
        required: "Please enter your firstname",
        rangelength: $.validator.format("Contains a maximum of {1} characters"),
      },
      lastName: {
        required: "Please enter your lastname",
        rangelength: $.validator.format("Contains a maximum of {1} characters"),
        validateName: true,
      },
      phoneNumber: {
        required: "Phone number required",
      },
      address: {
        required: "Delivery address required",
        rangelength: $.validator.format("Contains a maximum of {1} characters"),
      },
      postcode: {
        required: "Postcode required",
      },
    },
  });
});
