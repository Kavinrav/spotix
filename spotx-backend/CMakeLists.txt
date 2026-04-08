cmake_minimum_required(VERSION 3.16)
project(spotx_backend CXX)

set(CMAKE_CXX_STANDARD 17)

set(HTTPLIB_INSTALL OFF CACHE BOOL "" FORCE)

include(FetchContent)
FetchContent_Declare(
  httplib
  GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
  GIT_TAG v0.18.3
)
FetchContent_MakeAvailable(httplib)

add_executable(spotx-server
  src/main.cpp
)

if(MSVC)
  target_compile_definitions(spotx-server PRIVATE _CRT_SECURE_NO_WARNINGS)
endif()

target_link_libraries(spotx-server PRIVATE httplib::httplib)
