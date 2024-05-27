const domainUrl = "http://localhost:3000";
$(document).ready(function () {
  var selectedItem = {};

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
    $.get("http://localhost:3000/restaurants", function (data, status) {
      if (status === "success") {
        var $list = $("#restaurantList");
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
  });

  // Event handler for restaurant list item clicks
  $(document).on("click", "#restaurantList li a", function (event) {
    var restaurantId = $(this).data("id");
    $.get(
      "http://localhost:3000/menuItems/" + restaurantId,
      function (data, status) {
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
          console.error(
            "Failed to fetch restaurant details. Status: " + status
          );
          alert(
            "Failed to load the restaurant details. Please try again later."
          );
        }
      }
    );
  });

  // Event handler for menu list item clicks
  $("#menuItemList").on("click", "li", function () {
    selectedItem.id = $(this).find("a").data("id");
    selectedItem.name = $(this).find(".item-name").text();
    selectedItem.price = $(this).find(".item-price").data("item-price");
    selectedItem.description = $(this).find(".item-desc").text();
    selectedItem.image = $(this).find(".item-img").attr("src");

    $.mobile.changePage("#addOrderPage", { transition: "slide" });
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
        $.mobile.changePage("#homePage", { transition: "slide" });
      })
      .fail(function (xhr, status, error) {
        console.error("Error during checkout:", status, error);
      });
  });

  $(document).on("pagebeforeshow", "#orderListPage", function () {
    var userId = localStorage.getItem("userId");
    $.get(`${domainUrl}/orderList/${userId}`, function (data, status) {
      if (status === "success") {
        // Clear existing list items
        $("#orderList").empty();

        // Iterate over each order and create list item
        data.forEach(function (order) {
          // Create list item for each order
          var $orderItem = $("<li>").append(
            $("<h2>").text("Order ID: " + order._id), // Assuming order ID is stored in _id field
            $("<p>").text("User ID: " + order.user_id), // Assuming user ID is stored in user_id field
            $("<p>").text("Total Items: " + order.items.length) // Assuming items array contains order items
          );

          // Append order item to order list
          $("#orderList").append($orderItem);
        });

        // Refresh listview
        $("#orderList").listview("refresh");
      } else {
        console.error("Failed to fetch restaurant details. Status: " + status);
        alert("Failed to load the restaurant details. Please try again later.");
      }
    });
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

    $.get("http://localhost:3000/restaurants", function (data, status) {
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
  });

  // Select gift category and save to localStorage
  $("#itemList li").click(function () {
    var itemName = $(this).find(".itemName").text();
    var itemPrice = $(this).find(".itemPrice").text();
    var itemImage = $(this).find(".itemImage").attr("src");

    localStorage.setItem("itemName", itemName);
    localStorage.setItem("itemPrice", itemPrice);
    localStorage.setItem("itemImage", itemImage);
  });

  // Order form validation and submission
  $("#orderForm").validate({
    focusInvalid: false,
    onkeyup: false,
    submitHandler: function (form) {
      var formData = $(form).serializeArray();
      var orderInfo = {};

      formData.forEach(function (data) {
        orderInfo[data.name] = data.value;
      });

      orderInfo.itemName = localStorage.getItem("itemName");
      orderInfo.itemPrice = localStorage.getItem("itemPrice");
      orderInfo.itemImage = localStorage.getItem("itemImage");
      var userInfo = JSON.parse(localStorage.getItem("userInfo"));
      orderInfo.customerfName = userInfo.firstName;
      orderInfo.customerlName = userInfo.lastName;

      $.post(
        "http://localhost:3000/postOrderData",
        orderInfo,
        function (data, status) {
          if (debug) alert("Data sent: " + JSON.stringify(data));
          if (debug) alert("\nStatus: " + status);

          // Clear form data
          $("#orderForm").trigger("reset");
          lastOrder = orderInfo;
          $.mobile.changePage("#confirmPage");
        }
      );

      if (debug) alert("Customer: " + JSON.stringify(userInfo));
      if (debug) alert(JSON.stringify(orderInfo));
    },

    // Validation rules
    rules: {
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
      firstName: {
        required: "Please enter your firstname",
        rangelength: $.validator.format("Contains a maximum of {1} characters"),
      },
      lastName: {
        required: "Please enter your lastname",
        rangelength: $.validator.format("Contains a maximum of {1} characters"),
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

  // Initialization before login page is displayed
  $(document).on("pagebeforeshow", "#loginPage", function () {
    localStorage.removeItem("userInfo");
    authenticated = false;
  });

  // Populate the fill order page before it is displayed
  $(document).on("pagecreate", "#fillOrderPage", function () {
    $("#itemSelected").text(localStorage.getItem("itemName"));
    $("#priceSelected").text(localStorage.getItem("itemPrice"));
    $("#imageSelected").attr("src", localStorage.getItem("itemImage"));
  });

  // Populate the confirm page before it is displayed
  $(document).on("pagebeforeshow", "#confirmPage", function () {
    $("#orderConfirmation").html("");

    if (lastOrder != null) {
      $("#orderConfirmation").append("<br><table><tbody>");
      $("#orderConfirmation").append(
        '<tr><td>Customer: </td><td><span class="fcolor">' +
          lastOrder.customerfName +
          " " +
          lastOrder.customerlName +
          "</span></td></tr>"
      );
      $("#orderConfirmation").append(
        '<tr><td>Item: </td><td><span class="fcolor">' +
          lastOrder.itemName +
          "</span></td></tr>"
      );
      $("#orderConfirmation").append(
        '<tr><td>Price: </td><td><span class="fcolor">' +
          lastOrder.itemPrice +
          "</span></td></tr>"
      );
      $("#orderConfirmation").append(
        '<tr><td>Recipient: </td><td><span class="fcolor">' +
          lastOrder.firstName +
          " " +
          lastOrder.lastName +
          "</span></td></tr>"
      );
      $("#orderConfirmation").append(
        '<tr><td>Address: </td><td><span class="fcolor">' +
          lastOrder.address +
          " " +
          lastOrder.postcode +
          "</span></td></tr>"
      );
      $("#orderConfirmation").append(
        '<tr><td>Dispatch date: </td><td><span class="fcolor">' +
          lastOrder.date +
          "</span></td></tr>"
      );
      $("#orderConfirmation").append("</tbody></table><br>");
    } else {
      $("#orderConfirmation").append("<h4>There is no order to display<h4>");
    }
  });

  // Signup form validation and submission
  $("#signupButton").on("click", function () {
    $("#signupForm").submit();
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

      if (debug) alert(JSON.stringify(userInfo));

      $.post(
        "http://localhost:3000/postUserData",
        userInfo,
        function (data, status) {
          if (debug) console.log("Data sent: " + JSON.stringify(data));
          if (debug) console.log("\nStatus: " + status);

          // Redirects successfully registered user to home page
          localStorage.setItem("authenticated", true);
          alert("Successfully signed up.");
          localStorage.setItem("userInfo", JSON.stringify(userInfo));
          $.mobile.changePage("#homePage");
        }
      );
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

  // Delete orders button click handler
  $("#deletOrders").on("click", function () {
    localStorage.removeItem("orderInfo");

    if (localStorage.userInfo != null) {
      var userInfo = JSON.parse(localStorage.getItem("userInfo"));

      var filter = {
        customerfName: userInfo.firstName,
        customerlName: userInfo.lastName,
      };

      $.ajax({
        url: "http://localhost:3000/deleteOrders",
        type: "DELETE",
        contentType: "application/json",
        data: JSON.stringify(filter),
        success: function (data) {
          console.log("Orders deleted successfully:", data);

          $.mobile.changePage("#deleteOrderPage");

          $("#deleteOrder").html("");
          if (data.deletedCount > 0) {
            $("#deleteOrder").append(
              "<h4> " + data.deletedCount + " orders deleted</h4>"
            );
          } else {
            $("#deleteOrder").append(
              "<h4>No orders found for the current user.</h4>"
            );
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
          console.error("Error deleting orders:", textStatus, errorThrown);
        },
      });
    }
  });
});
