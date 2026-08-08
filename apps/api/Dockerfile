FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 5000
ENV ASPNETCORE_URLS=http://+:5000

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["AITranslateMeeting.Api.csproj", "./"]
RUN dotnet restore "AITranslateMeeting.Api.csproj"
COPY . .
RUN dotnet build "AITranslateMeeting.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "AITranslateMeeting.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AITranslateMeeting.Api.dll"]
